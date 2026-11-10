import assert from 'node:assert/strict'
import test from 'node:test'
import { setup } from './helpers/economy-harness.mjs'

function harness(redis = false) {
  return setup(redis, ['shared/utils/parcel-game.ts', 'server/utils/parcel-game.ts'])
}
function board() {
  return {
    year: 2026,
    startsAt: '2026-11-20T03:00:00Z',
    endsAt: '2026-12-28T12:00:00Z',
    ended: false,
    players: ['Nicole', 'Mathias', 'constructor'],
    parcels: [
      { id: 'p1', style: 0, owner: null, amount: 50 },
      { id: 'p2', style: 1, owner: 'Mathias', amount: 100 },
    ],
    turns: {},
    pending: {},
    events: [],
  }
}
const now = new Date('2026-12-01T12:00:00Z')
const day = '2026-12-01'

test('two daily rolls, replay safety and 04 reset are enforced by the engine', () => {
  const { api: a } = harness(),
    b = board()
  for (let i = 0; i < 2; i++) a.rollParcel(b, 'Nicole', day, `roll-${i}`, 2, 0, now)
  a.rollParcel(b, 'Nicole', day, 'roll-0', 6, 0, now)
  assert.equal(a.parcelView(b, 'Nicole', now).remaining, 0)
  assert.throws(() => a.rollParcel(b, 'Nicole', day, 'third', 2, 0, now), /to slag/)
  const before = new Date('2026-12-02T02:59:59Z'),
    after = new Date('2026-12-02T03:00:00Z')
  assert.equal(a.parcelView(b, 'Nicole', before).remaining, 0)
  assert.equal(a.parcelView(b, 'Nicole', after).remaining, 2)
  assert.throws(() => a.rollParcel(b, 'Nicole', day, 'stale', 2, 0, after), /spildøgn/)
})
test('only six grants a choice; middle must be emptied before stealing; no own gifts', () => {
  const { api: a } = harness(),
    b = board()
  a.rollParcel(b, 'Nicole', day, 'one', 1, 0, now)
  assert.equal(a.parcelView(b, 'Nicole', now).pending, undefined)
  a.rollParcel(b, 'Nicole', day, 'six', 6, 0, now)
  assert.throws(() => a.takeParcel(b, 'Nicole', 'p2', now), /fremhævede/)
  assert.throws(() => a.rollParcel(b, 'Nicole', day, 'again', 6, 0, now), /først/)
  a.takeParcel(b, 'Nicole', 'p1', now)
  const next = new Date('2026-12-02T12:00:00Z')
  a.rollParcel(b, 'Nicole', '2026-12-02', 'six2', 6, 0, next)
  assert.throws(() => a.takeParcel(b, 'Nicole', 'p1', next), /fremhævede/)
  a.takeParcel(b, 'Nicole', 'p2', next)
  assert.equal(b.parcels[1].owner, 'Nicole')
  assert.equal(b.events[0].from, 'Mathias')
})
test('pending choice auto-resolves after 60 seconds, including after leaving overnight', () => {
  const { api: a } = harness(),
    b = board()
  a.rollParcel(b, 'Nicole', day, 'six', 6, 0, now)
  a.advanceParcels(b, new Date(now.getTime() + 59999))
  assert.equal(b.parcels[0].owner, null)
  a.advanceParcels(b, new Date('2026-12-02T12:00:00Z'))
  assert.equal(b.parcels[0].owner, 'Nicole')
  assert.equal(a.parcelView(b, 'Nicole', now).pending, undefined)
  const count = b.events.length
  a.advanceParcels(b, new Date('2026-12-03T12:00:00Z'))
  assert.equal(b.events.length, count)
})
test('hidden end freezes ownership, resolves last pending roll and reveals only final prizes', () => {
  const { api: a } = harness(),
    b = board()
  const stamp = new Date(Date.parse(b.endsAt) - 1000)
  a.rollParcel(b, 'Nicole', a.gameDay(stamp), 'last', 6, 0, stamp)
  const publicBefore = JSON.stringify(a.parcelView(b, 'Nicole', stamp))
  assert.ok(!publicBefore.includes('endsAt'))
  assert.ok(!publicBefore.includes('ticket'))
  assert.ok(!publicBefore.includes('amount'))
  a.advanceParcels(b, new Date(b.endsAt))
  assert.equal(b.ended, true)
  assert.equal(b.parcels[0].owner, 'Nicole')
  assert.equal(a.parcelView(b, 'Nicole', new Date(b.endsAt)).parcels[0].amount, undefined)
  assert.throws(
    () => a.rollParcel(b, 'Mathias', day, 'late', 6, 0, new Date(b.endsAt)),
    /ikke åben/,
  )
})
test('prototype-like names have independent daily limits', () => {
  const { api: a } = harness(),
    b = board()
  a.rollParcel(b, 'constructor', day, 'safe', 6, 0, now)
  a.takeParcel(b, 'constructor', 'p1', now)
  assert.equal(a.parcelView(b, 'constructor', now).remaining, 1)
})
for (const redis of [false, true])
  test(`global game CAS serializes competing devices (${redis ? 'Redis' : 'local'})`, async () => {
    const { api: a } = harness(redis)
    await a.mutateParcels(2026, ['Nicole'], (g) => {
      g.startsAt = '2026-11-01T00:00:00Z'
    })
    const results = await Promise.allSettled(
      Array.from({ length: 8 }, (_, i) =>
        a.mutateParcels(2026, ['Nicole'], (g) =>
          a.rollParcel(g, 'Nicole', '2026-11-09', `r${i}`, 2, 0, new Date('2026-11-09T12:00:00Z')),
        ),
      ),
    )
    assert.equal(results.filter((r) => r.status === 'fulfilled').length, 2)
    const { game } = await a.mutateParcels(2026, ['Nicole'], () => {})
    assert.equal(game.turns['u:Nicole']['2026-11-09'].length, 2)
  })
test('final winnings are credited exactly once across retries', async () => {
  const { api: a } = harness(),
    b = board()
  a.notifyUser = async () => {}
  b.ended = true
  b.parcels[0].owner = 'Nicole'
  await a.settleParcelPrizes(b)
  assert.equal(await a.readEconomy('Nicole'), undefined)
  a.reserveParcelOpening(b, 'Nicole', 'p1', new Date(b.endsAt))
  await a.mutateParcels(2026, [], (g) => Object.assign(g, b))
  await Promise.all([a.settleParcelPrizes(b), a.settleParcelPrizes(b)])
  const wallet = await a.readEconomy('Nicole')
  assert.equal(wallet.balance, 50)
  assert.equal(wallet.history.length, 1)
})
