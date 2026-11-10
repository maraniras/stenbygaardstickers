import assert from 'node:assert/strict'
import test from 'node:test'
import { setup } from './helpers/economy-harness.mjs'

const context = { stickers: [], ratings: {}, comments: {} }
const harness = (redis = false) =>
  setup(redis, ['shared/utils/parcel-game.ts', 'server/utils/parcel-game.ts'])

test('gift pool contains two gifts per participant', () => {
  const { api: a } = harness()
  for (const [people, gifts] of [
    [0, 0],
    [1, 2],
    [2, 4],
    [3, 6],
    [7, 14],
    [10, 20],
  ])
    assert.equal(a.parcelCount(people), gifts)
})
for (const redis of [false, true])
  test(`pool grows to the rounded total without replacing existing gifts (${redis ? 'Redis' : 'local'})`, async () => {
    const { api: a } = harness(redis)
    const { game: first } = await a.mutateParcels(2026, ['Nicole'], (g) => {
      g.parcels[0].owner = 'Nicole'
    })
    const original = JSON.stringify(first.parcels[0])
    const names = ['Nicole', 'Mathias', 'Norsk', 'A', 'B', 'C', 'D']
    const { game } = await a.mutateParcels(2026, names, () => {})
    assert.equal(game.players.length, 7)
    assert.equal(game.parcels.length, 14)
    assert.equal(JSON.stringify(game.parcels[0]), original)
    const { game: repeated } = await a.mutateParcels(2026, names, () => {})
    assert.equal(repeated.parcels.length, 14)
    assert.equal(new Set(repeated.parcels.map((p) => p.id)).size, 14)
  })
test('signup runs November20 at04 through November26 inclusive in Danish time; play starts November27 at04', () => {
  const { api: a } = harness()
  for (const [at, open] of [
    ['2026-11-20T02:59:59Z', false],
    ['2026-11-20T03:00:00Z', true],
    ['2026-11-26T22:59:59Z', true],
    ['2026-11-26T23:00:00Z', false],
    ['2026-11-27T02:59:59Z', false],
    ['2026-11-27T03:00:00Z', false],
  ])
    assert.equal(a.parcelSchedule(2026, new Date(at)).registrationOpen, open, at)
  assert.equal(a.parcelSchedule(2026).startsAt, '2026-11-27T03:00:00.000Z')
})

for (const redis of [false, true])
  test(`existing unstarted campaign moves to November27 without changing gifts or secret end (${redis ? 'Redis' : 'local'})`, async () => {
    const { api: a } = harness(redis)
    const { game: original } = await a.mutateParcels(2026, ['Nicole'], (g) => {
      g.startsAt = '2026-12-01T03:00:00.000Z'
    })
    const parcels = JSON.stringify(original.parcels)
    const { game } = await a.mutateParcels(2026, ['Nicole'], () => {})
    assert.equal(game.startsAt, '2026-11-27T03:00:00.000Z')
    assert.equal(game.endsAt, original.endsAt)
    assert.equal(JSON.stringify(game.parcels), parcels)
  })
test('registration rejects insufficient balance and dates outside the window without changing the wallet', () => {
  const { api: a } = harness(),
    wallet = a.freshEconomy()
  wallet.balance = 99
  const before = JSON.stringify(wallet)
  assert.throws(
    () => a.payParcelEntry(wallet, 2026, new Date('2026-11-20T12:00:00Z')),
    /100 bananer/,
  )
  assert.equal(JSON.stringify(wallet), before)
  wallet.balance = 200
  assert.throws(
    () => a.payParcelEntry(wallet, 2026, new Date('2026-11-27T00:00:00Z')),
    /Tilmeldingen/,
  )
  assert.equal(wallet.balance, 200)
  assert.equal(wallet.claims[a.parcelEntryClaim(2026)], undefined)
})
for (const redis of [false, true])
  test(`two devices pay exactly once, and a durable receipt recovers membership after a lost response (${redis ? 'Redis' : 'local'})`, async () => {
    const { api: a } = harness(redis)
    await a.mutateEconomy('Nicole', (w) => {
      w.balance = 200
    })
    await Promise.all(
      Array.from({ length: 8 }, () =>
        a.mutateEconomy('Nicole', (w) =>
          a.payParcelEntry(w, 2026, new Date('2026-11-25T12:00:00Z')),
        ),
      ),
    )
    let wallet = await a.readEconomy('Nicole')
    assert.equal(wallet.balance, 100)
    assert.equal(wallet.history.length, 1)
    assert.equal(wallet.history[0].amount, -100)
    // A paid retry remains recoverable even after the signup window closed.
    assert.equal(a.payParcelEntry(wallet, 2026, new Date('2026-12-02T12:00:00Z')), false)
    a.listUsers = async () => [{ name: 'Nicole' }, { name: 'Mathias' }]
    a.economyContext = async () => context
    a.notifyUser = async () => {}
    const view = await a.parcelRequest('Nicole')
    assert.equal(view.joined, true)
    assert.deepEqual(Array.from(view.players), ['Nicole'])
    assert.equal(view.parcels.length, 2)
    const spectator = await a.parcelRequest('Mathias')
    assert.equal(spectator.joined, false)
    assert.equal(spectator.parcels.length, 2)
    wallet = await a.readEconomy('Nicole')
    assert.equal(wallet.balance, 100)
  })
