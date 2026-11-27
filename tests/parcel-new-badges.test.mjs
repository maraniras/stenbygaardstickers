import assert from 'node:assert/strict'
import test from 'node:test'
import { setup } from './helpers/economy-harness.mjs'

const stamp = new Date('2026-12-01T12:00:00Z')
const end = '2026-12-28T12:00:00Z'
const harness = (redis = false) =>
  setup(redis, [
    'shared/utils/parcel-badges.ts',
    'shared/utils/parcel-game.ts',
    'server/utils/parcel-game.ts',
  ])
function board() {
  return {
    year: 2026,
    startsAt: '2026-11-27T03:00:00Z',
    endsAt: end,
    ended: false,
    players: ['A', 'B', 'C', 'D', 'E', 'F'],
    parcels: ['A', 'B', 'C', 'D', 'E', 'F'].map((owner, i) => ({
      id: `p${i}`,
      owner,
      style: 0,
      amount: 50,
    })),
    turns: {},
    pending: {},
    events: [],
  }
}
function take(a, game, name, parcel, at = stamp) {
  game.pending[`u:${name}`] = { id: `r${game.collectionSequence ?? 0}`, deadline: end, ticket: 0 }
  a.takeParcel(game, name, parcel, at)
}

test('theft totals and repeated loss survive event pruning and a persisted reload', () => {
  const { api: a } = harness(),
    game = board()
  for (let i = 0; i < 19; i++) take(a, game, i % 2 ? 'A' : 'B', 'p0')
  let earned = a.parcelAwards(game, 'A')
  assert.ok(earned['parcel-stolen-ten'])
  assert.equal(earned['parcel-steal-ten'], undefined)
  assert.ok(earned['parcel-return-to-sender'])
  assert.ok(earned['parcel-mine-again'])
  take(a, game, 'A', 'p0')
  assert.ok(a.parcelAwards(game, 'A')['parcel-steal-ten'])
  for (let i = 0; i < 110; i++) take(a, game, i % 2 ? 'A' : 'B', 'p0')
  const loaded = JSON.parse(JSON.stringify(game))
  assert.equal(loaded.events.length, 100)
  earned = a.parcelAwards(loaded, 'A')
  for (const id of [
    'parcel-steal-ten',
    'parcel-stolen-ten',
    'parcel-return-to-sender',
    'parcel-mine-again',
  ])
    assert.ok(earned[id], id)
  assert.equal(a.parcelAwards(board(), 'A')['parcel-steal-ten'], undefined)
  assert.equal(a.parcelView(loaded, 'A', stamp).badgeTracking, undefined)
})

test('distinct opponents require five different people, and table gifts are not thefts', () => {
  const { api: a } = harness(),
    game = board()
  game.parcels.forEach((p) => {
    p.owner = null
  })
  for (let i = 0; i < 6; i++) take(a, game, game.players[i], `p${i}`)
  assert.equal(game.badgeTracking.players['u:A']?.stolen ?? 0, 0)
  for (let i = 1; i < 6; i++) {
    take(a, game, game.players[i], 'p0')
    take(a, game, 'A', 'p0')
    assert.equal(!!a.parcelAwards(game, 'A')['parcel-everyone-against-me'], i === 5)
    assert.equal(!!a.parcelAwards(game, 'A')['parcel-grinch'], i === 5)
  }
})

test('return to sender requires the same gift and the player who stole it', () => {
  const { api: a } = harness(),
    game = board()
  take(a, game, 'B', 'p0')
  take(a, game, 'C', 'p0')
  take(a, game, 'A', 'p0')
  assert.equal(a.parcelAwards(game, 'A')['parcel-return-to-sender'], undefined)
  take(a, game, 'C', 'p0')
  assert.ok(a.parcelAwards(game, 'C')['parcel-return-to-sender'])
})

test('comeback requires zero during stealing and five gifts at the actual finish', () => {
  const { api: a } = harness(),
    game = board()
  take(a, game, 'B', 'p0')
  for (let i = 0; i < 5; i++) take(a, game, 'A', `p${i}`)
  assert.equal(a.parcelAwards(game, 'A')['parcel-zero-to-christmas'], undefined)
  game.ended = true
  assert.ok(a.parcelAwards(game, 'A')['parcel-zero-to-christmas'])
  const noZero = board()
  for (let i = 1; i < 5; i++) take(a, noZero, 'A', `p${i}`)
  noZero.ended = true
  assert.equal(a.parcelAwards(noZero, 'A')['parcel-zero-to-christmas'], undefined)
  game.parcels[0].owner = 'B'
  assert.equal(a.parcelAwards(game, 'A')['parcel-zero-to-christmas'], undefined)
})

test('retained history is imported once without counting events twice', () => {
  const { api: a } = harness(),
    game = board()
  take(a, game, 'B', 'p0')
  take(a, game, 'A', 'p0')
  delete game.badgeTracking
  assert.ok(a.parcelAwards(game, 'A')['parcel-return-to-sender'])
  assert.equal(game.badgeTracking.players['u:A'].stolen, 1)
  a.parcelAwards(game, 'A')
  take(a, game, 'B', 'p0')
  assert.equal(game.badgeTracking.players['u:A'].lost, 2)
})

test('twenty sixes span days but the miracle requires all three rolls in one 04–04 game day', () => {
  const { api: a } = harness(),
    game = board()
  for (let i = 0; i < 19; i++) {
    const day = `2026-12-${String(i + 1).padStart(2, '0')}`
    game.turns['u:A'] ??= {}
    game.turns['u:A'][day] = [{ id: `r${i}`, die: 6, at: `${day}T12:00:00Z` }]
  }
  assert.equal(a.parcelAwards(game, 'A')['parcel-twenty-sixes'], undefined)
  assert.equal(a.parcelAwards(game, 'A')['parcel-christmas-miracle'], undefined)
  game.turns['u:A']['2026-12-20'] = [
    { id: 'r20', die: 6, at: '2026-12-20T12:00:00Z' },
    { id: 'r21', die: 6, at: '2026-12-21T01:00:00Z' },
    { id: 'r22', die: 6, at: '2026-12-21T02:59:59Z' },
  ]
  assert.equal(a.parcelAwards(game, 'A')['parcel-twenty-sixes'], '2026-12-20T12:00:00Z')
  assert.equal(a.parcelAwards(game, 'A')['parcel-christmas-miracle'], '2026-12-21T02:59:59Z')
  game.cancelled = true
  assert.equal(Object.keys(a.parcelAwards(game, 'A')).length, 0)
})

test('automatic timed-out choices update the same durable badge counters', () => {
  const { api: a } = harness(),
    game = board()
  take(a, game, 'B', 'p0')
  a.rollParcel(game, 'A', a.gameDay(stamp), 'auto', 6, 0, stamp)
  a.advanceParcels(game, new Date(stamp.getTime() + 61000))
  assert.ok(a.parcelAwards(game, 'A')['parcel-return-to-sender'])
})

for (const redis of [false, true])
  test(`all nine rewards have exact points and pay only once across seasons (${redis ? 'Redis' : 'local'})`, async () => {
    const { api: a } = harness(redis),
      game = board()
    a.economyContext = async () => ({ stickers: [], ratings: {}, comments: {} })
    const expected = [
      ['parcel-twenty-sixes', 4, 150],
      ['parcel-steal-ten', 3, 100],
      ['parcel-stolen-ten', 3, 100],
      ['parcel-return-to-sender', 1, 25],
      ['parcel-everyone-against-me', 2, 75],
      ['parcel-grinch', 2, 75],
      ['parcel-zero-to-christmas', 4, 150],
      ['parcel-mine-again', 2, 75],
      ['parcel-christmas-miracle', 3, 100],
    ]
    const progress = a.ensureParcelProgress(game)
    progress.players['u:A'] = {
      stolen: 10,
      lost: 10,
      victims: [],
      thieves: [],
      losses: {},
      awards: Object.fromEntries(expected.map(([id]) => [id, stamp.toISOString()])),
    }
    await a.mutateEconomy('A', (w) => {
      w.claims.welcome = true
    })
    await Promise.all(Array.from({ length: 4 }, () => a.settleParcelAchievements(game, {})))
    let wallet = await a.readEconomy('A')
    const badges = a.badgesFor('A', [], {}, { economy: { a: a.publicEconomy(wallet) } })
    for (const [id, points, bananas] of expected) {
      const badge = badges.find((b) => b.id === id)
      assert.ok(badge.earned, id)
      assert.equal(badge.points, points, id)
      assert.equal(a.bananaRewardFor(badge), bananas, id)
    }
    assert.equal(wallet.balance, 850)
    assert.equal(wallet.history.length, 9)
    game.year = 2027
    await a.settleParcelAchievements(game, {})
    wallet = await a.readEconomy('A')
    assert.equal(wallet.balance, 850)
  })
