import assert from 'node:assert/strict'
import test from 'node:test'
import { setup } from './helpers/economy-harness.mjs'

const harness = (redis = false) =>
  setup(redis, [
    'shared/utils/parcel-game.ts',
    'shared/utils/parcel-rewards.ts',
    'server/utils/parcel-game.ts',
  ])
const end = '2026-12-28T12:00:00Z'
function board() {
  return {
    year: 2026,
    startsAt: '2026-11-27T03:00:00Z',
    endsAt: end,
    ended: true,
    players: ['Nicole', 'Mathias', 'Norsk'],
    parcels: [
      {
        id: 'p1',
        style: 0,
        owner: 'Nicole',
        amount: 50,
        reward: { kind: 'mix-max', amount: 50, title: 'Mix Max' },
      },
      {
        id: 'p2',
        style: 1,
        owner: 'Mathias',
        amount: 250,
        reward: { kind: 'bananas', amount: 250, title: 'Bananbunke' },
      },
    ],
    turns: {},
    pending: {},
    events: [],
    prizesAssigned: true,
  }
}

test('20 gifts contain the agreed unique prizes, three elves and the configured bananas', () => {
  const { api: a } = harness(),
    pool = a.parcelRewardPool(20)
  assert.equal(pool.length, 20)
  for (const kind of ['mix-max', 'cake', 'faxe-kondi', 'frame', 'golden', 'snowglobe'])
    assert.equal(pool.filter((p) => p.kind === kind).length, 1)
  assert.equal(pool.filter((p) => p.kind === 'bottle').length, 2)
  assert.equal(pool.filter((p) => p.kind === 'elf').length, 3)
  assert.equal(
    pool.reduce((n, p) => n + p.amount, 0),
    1703,
  )
  assert.equal(pool.filter((p) => p.amount === 500).length, 1)
  assert.equal(a.isParcelPhysical(pool.find((p) => p.kind === 'cake')), true)
  assert.equal(pool.find((p) => p.kind === 'cake').amount, 50)
  assert.equal(pool.find((p) => p.kind === 'faxe-kondi').amount, 50)
  assert.equal(a.isParcelPhysical(pool.find((p) => p.kind === 'faxe-kondi')), true)
  for (let count = 8; count <= 100; count += 2) {
    const gifts = a.parcelRewardPool(count)
    assert.equal(gifts.length, count)
    assert.equal(gifts.filter((p) => p.kind === 'cake').length, 1)
    assert.equal(gifts.filter((p) => p.kind === 'faxe-kondi').length, 1)
    const mixMax = gifts.filter((p) => p.kind === 'mix-max')
    assert.equal(mixMax.length, count >= 24 ? 2 : 1)
    assert.ok(mixMax.every((p) => p.amount === 50))
  }
  assert.throws(() => a.parcelRewardPool(6), /fire deltagere/)
  for (const p of pool.filter((p) => p.kind === 'bananas'))
    assert.ok(p.amount >= 25 && p.amount <= 250)
  const small = a.parcelRewardPool(10)
  assert.equal(
    small.some((p) => p.kind === 'bottle' || p.kind === 'snowglobe'),
    false,
  )
  assert.equal(
    a.parcelRewardPool(12).filter((p) => p.kind === 'bottle' || p.kind === 'snowglobe').length,
    3,
  )
})
test('unopened contents stay secret even to their owner after the game ends, reservations are private', () => {
  const { api: a } = harness(),
    b = board(),
    now = new Date(end)
  for (const name of ['Nicole', 'Mathias', null])
    assert.ok(!JSON.stringify(a.parcelView(b, name, now)).includes('reward'))
  assert.throws(() => a.reserveParcelOpening(b, 'Mathias', 'p1', now), /egne/)
  b.ended = false
  assert.throws(() => a.reserveParcelOpening(b, 'Nicole', 'p1', now), /først/)
  b.ended = true
  a.reserveParcelOpening(b, 'Nicole', 'p1', now)
  assert.ok(!JSON.stringify(a.parcelView(b, 'Nicole', now)).includes('Mix Max'))
  b.parcels[0].openedAt = b.parcels[0].openingAt
  const view = a.parcelView(b, 'Mathias', now)
  assert.equal(view.parcels[0].reward.kind, 'mix-max')
  assert.equal(view.parcels[1].reward, undefined)
})
test('collection closes exactly 14 days after the secret end, including across New Year', () => {
  const { api: a } = harness(),
    b = board(),
    deadline = Date.parse(end) + 14 * 86400000
  assert.equal(a.parcelView(b, 'Nicole', new Date(deadline - 1)).phase, 'ended')
  assert.equal(a.parcelView(b, 'Nicole', new Date(deadline)).phase, 'archived')
  assert.throws(() => a.reserveParcelOpening(b, 'Nicole', 'p1', new Date(deadline)), /udløbet/)
  a.reserveParcelOpening(b, 'Nicole', 'p1', new Date(deadline - 1))
  assert.doesNotThrow(() => a.reserveParcelOpening(b, 'Nicole', 'p1', new Date(deadline + 100)))
})
for (const redis of [false, true])
  test(`requested opening delivers one durable prize receipt and one credit (${redis ? 'Redis' : 'local'})`, async () => {
    const { api: a } = harness(redis),
      b = board()
    a.reserveParcelOpening(b, 'Nicole', 'p1', new Date(end))
    await a.mutateParcels(2026, [], (g) => Object.assign(g, b))
    await Promise.all([a.settleParcelPrizes(b), a.settleParcelPrizes(b), a.settleParcelPrizes(b)])
    const w = await a.readEconomy('Nicole')
    assert.equal(w.balance, 50)
    assert.equal(w.history.length, 1)
    assert.equal(Object.values(w.parcelRewards).length, 1)
    assert.equal(w.parcelRewards['parcel-open:2026:p1'].reward.kind, 'mix-max')
    const { game } = await a.mutateParcels(2026, [], () => {})
    assert.ok(game.parcels[0].openedAt)
    assert.equal(game.parcels[1].openedAt, undefined)
    assert.equal(await a.readEconomy('Mathias'), undefined)
  })
test('wallet delivery resumes after a crash before public reveal, without crediting again', async () => {
  const { api: a } = harness(),
    b = board()
  a.reserveParcelOpening(b, 'Nicole', 'p1', new Date(end))
  await a.mutateParcels(2026, [], (g) => Object.assign(g, b))
  const storage = a.useStorage()
  let fail = true
  a.useStorage = () => ({
    ...storage,
    setItem: async (key, value) => {
      if (fail && key === 'parcel-games-v2' && value?.['2026']?.parcels[0].openedAt) {
        fail = false
        throw Error('Interrupted')
      }
      return storage.setItem(key, value)
    },
  })
  await assert.rejects(() => a.settleParcelPrizes(b), /Interrupted/)
  assert.equal((await a.readEconomy('Nicole')).balance, 50)
  const final = await a.settleParcelPrizes(b)
  assert.ok(final.parcels[0].openedAt)
  assert.equal((await a.readEconomy('Nicole')).balance, 50)
})
test('physical cake gift stays hidden until opening and pays 50 once', async () => {
  const { api: a } = harness(),
    b = board()
  b.parcels[0].reward = { kind: 'cake', amount: 50, title: 'Træstammer' }
  assert.equal(a.parcelView(b, 'Nicole', new Date(end)).parcels[0].reward, undefined)
  a.reserveParcelOpening(b, 'Nicole', 'p1', new Date(end))
  await a.mutateParcels(2026, [], (g) => Object.assign(g, b))
  await a.settleParcelPrizes(b)
  await a.settleParcelPrizes(b)
  const wallet = await a.readEconomy('Nicole')
  assert.equal(wallet.balance, 50)
  assert.equal(wallet.parcelRewards['parcel-open:2026:p1'].reward.kind, 'cake')
  const { game } = await a.mutateParcels(2026, [], () => {})
  const visible = a.parcelView(game, 'Mathias', new Date(end)).parcels[0].reward
  assert.equal(visible.title, 'Træstammer')
  assert.equal(a.isParcelPhysical(visible), true)
})

test('exclusive frame is granted and equipped only when its owner opens it', async () => {
  const { api: a } = harness(),
    b = board(),
    user = {}
  b.parcels[0].reward = { kind: 'frame', amount: 0, title: 'Eksklusiv profilramme' }
  b.parcels[0].amount = 0
  a.updateUser = async (_key, change) => change(user)
  await a.mutateParcels(2026, [], (g) => Object.assign(g, b))
  await a.settleParcelPrizes(b)
  assert.equal(user.frame, undefined)
  a.reserveParcelOpening(b, 'Nicole', 'p1', new Date(end))
  await a.mutateParcels(2026, [], (g) => Object.assign(g, b))
  await a.settleParcelPrizes(b)
  assert.equal(user.frame, 'parcel-2026')
  assert.equal(
    (await a.readEconomy('Nicole')).parcelRewards['parcel-open:2026:p1'].reward.kind,
    'frame',
  )
})
test('full request keeps contents hidden on GET and reveals just the requested gift on opening', async () => {
  const { api: a } = harness(),
    b = board()
  const clock = Date.parse(end)
  a.Date = class extends Date {
    constructor(value = clock) {
      super(value)
    }
    static now() {
      return clock
    }
  }
  a.listUsers = async () => b.players.map((name) => ({ name }))
  a.economyContext = async () => ({ stickers: [], ratings: {}, comments: {} })
  a.notifyUser = async () => {}
  await a.mutateParcels(2026, [], (g) => Object.assign(g, b))
  for (const name of b.players)
    await a.mutateEconomy(name, (w) => {
      w.claims[a.parcelEntryClaim(2026)] = true
    })
  const before = await a.parcelRequest('Nicole')
  assert.equal(before.parcels[0].reward, undefined)
  assert.equal((await a.readEconomy('Nicole')).balance, 0)
  const opened = await a.parcelRequest('Nicole', {
    kind: 'open',
    id: 'request-open-p1',
    parcel: 'p1',
  })
  assert.equal(opened.parcels[0].reward.kind, 'mix-max')
  assert.equal(opened.parcels[1].reward, undefined)
  await a.parcelRequest('Nicole', { kind: 'open', id: 'request-open-p1-again', parcel: 'p1' })
  assert.equal((await a.readEconomy('Nicole')).balance, 50)
})
test('prizes freeze once at game start; too few participants receive a single refund', async () => {
  const { api: a } = harness(),
    names = ['Nicole', 'Mathias', 'Norsk', 'Emil']
  const { game } = await a.mutateParcels(2026, names, () => {})
  a.prepareParcelRewards(game, new Date('2026-11-27T02:59:59Z'))
  assert.equal(game.prizesAssigned, undefined)
  a.prepareParcelRewards(game, new Date('2026-11-27T03:00:00Z'))
  assert.equal(game.prizesAssigned, true)
  const contents = JSON.stringify(game.parcels)
  a.prepareParcelRewards(game, new Date(end))
  assert.equal(JSON.stringify(game.parcels), contents)
  const { game: small } = await a.mutateParcels(2027, ['Nicole', 'Mathias', 'Norsk'], () => {})
  await a.mutateEconomy('Nicole', (w) => {
    w.balance = 200
    a.payParcelEntry(w, 2027, new Date('2027-11-25T12:00:00Z'))
  })
  a.prepareParcelRewards(small, new Date('2027-11-27T03:00:00Z'))
  assert.equal(small.cancelled, true)
  await a.settleParcelPrizes(small)
  await a.settleParcelPrizes(small)
  assert.equal((await a.readEconomy('Nicole')).balance, 200)
})
