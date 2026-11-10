import assert from 'node:assert/strict'
import test from 'node:test'
import { setup } from './helpers/economy-harness.mjs'

const end = '2026-12-28T12:00:00.000Z'
const context = { stickers: [], ratings: {}, comments: {} }
function board(count = 0) {
  return {
    year: 2026,
    startsAt: '2026-11-27T03:00:00.000Z',
    endsAt: end,
    ended: false,
    players: ['Nicole'],
    parcels: Array.from({ length: count }, (_, i) => ({
      id: `p${i + 1}`,
      owner: 'Nicole',
      style: 0,
      amount: 50,
    })),
    turns: {},
    pending: {},
    events: [],
  }
}
const harness = (redis = false) =>
  setup(redis, ['shared/utils/parcel-badges.ts', 'server/utils/parcel-game.ts'])

test('final badges use frozen ownership, not gifts during play or opened gifts', () => {
  const { api: a } = harness()
  for (const [count, expected] of [
    [0, ['parcel-empty']],
    [1, []],
    [2, []],
    [3, ['parcel-three']],
    [4, ['parcel-three']],
    [5, ['parcel-five', 'parcel-three']],
    [8, ['parcel-five', 'parcel-three']],
  ]) {
    const game = board(count)
    assert.deepEqual(Object.keys(a.parcelAwards(game, 'Nicole')), [])
    game.ended = true
    assert.deepEqual(Object.keys(a.parcelAwards(game, 'Nicole')).sort(), expected)
    assert.deepEqual(Object.keys(a.parcelAwards(game, 'Spectator')), [])
    game.cancelled = true
    assert.deepEqual(Object.keys(a.parcelAwards(game, 'Nicole')), [])
  }
})

test('six sixes count across days of one campaign, without requiring consecutive rolls', () => {
  const { api: a } = harness(),
    game = board()
  const rolls = [6, 2, 6, 6, 1, 6, 4, 6, 6]
  for (const [i, die] of rolls.entries()) {
    const day = `2026-12-0${Math.floor(i / 2) + 1}`
    ;(game.turns['u:Nicole'] ??= {})[day] ??= []
    game.turns['u:Nicole'][day].push({ id: `r${i}`, die, at: `${day}T12:0${i % 2}:00.000Z` })
    assert.equal(!!a.parcelAwards(game, 'Nicole')['parcel-sixes'], i === 8)
  }
  assert.equal(a.parcelAwards(game, 'Nicole')['parcel-sixes'], '2026-12-05T12:00:00.000Z')
  const nextYear = board()
  nextYear.year = 2027
  assert.equal(a.parcelAwards(nextYear, 'Nicole')['parcel-sixes'], undefined)
})

for (const redis of [false, true])
  test(`awards and banana credits persist once through concurrent retries and later seasons (${redis ? 'Redis' : 'local'})`, async () => {
    const { api: a } = harness(redis),
      game = board(5)
    a.economyContext = async () => context
    game.ended = true
    // Avoid unrelated first-login/wealth rewards in the assertions below.
    await a.mutateEconomy('Nicole', (w) => {
      w.claims.welcome = true
    })
    await Promise.all(Array.from({ length: 5 }, () => a.settleParcelAchievements(game, {})))
    let wallet = await a.readEconomy('Nicole')
    assert.equal(wallet.balance, 40)
    assert.equal(wallet.history.length, 2)
    const earned = a
      .badgesFor('Nicole', [], {}, { economy: { nicole: a.publicEconomy(wallet) } })
      .filter((b) => b.id.startsWith('parcel-') && b.earned)
    assert.equal(earned.length, 2)
    for (const badge of earned) {
      assert.equal(badge.points, 1)
      assert.equal(a.bananaRewardFor(badge), 20)
    }
    assert.equal(a.publicEconomy(wallet).parcelRewards, undefined)
    assert.equal(a.publicEconomy(wallet).parcelAchievements['parcel-five'], end)
    game.year = 2027
    game.endsAt = '2027-12-29T12:00:00.000Z'
    await a.settleParcelAchievements(game, {})
    wallet = await a.readEconomy('Nicole')
    assert.equal(wallet.balance, 40)
    assert.equal(wallet.parcelAchievements['parcel-five'], end)
  })
