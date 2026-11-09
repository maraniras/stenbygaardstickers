import assert from 'node:assert/strict'
import test from 'node:test'
import { setup } from './helpers/economy-harness.mjs'

const now = new Date('2026-12-01T03:00:00Z')
const names = [
  'Mathias',
  'Tobias Frost',
  'Emil',
  'Norsk',
  ...Array.from({ length: 25 }, (_, i) => `Ven ${i}`),
]
const users = names.map((name) => ({ name, createdAt: '2026-11-07T12:00:00Z' }))
function harness(redis = false) {
  const h = setup(redis, ['server/utils/advent.ts', 'server/utils/advent-draw.ts'])
  h.api.structuredClone = structuredClone
  h.api.listUsers = async () => users
  h.api.process = { env: {} }
  return h
}
const prizes = (plan) => plan.flatMap((d) => [d.prize, ...(d.extras ?? [])])

test('100 seeded calendars respect all stocks, exclusions and individual count bounds', () => {
  const { api: a } = harness()
  for (let seed = 0; seed < 100; seed++) {
    const draw = a.createAdventDraw(users, String(seed), now)
    const all = Object.values(draw.plans).flatMap(prizes)
    for (const [reward, count] of [
      ['mix-max', 5],
      ['red-wine', 1],
      ['white-wine', 1],
      ['cycling-bottle', 2],
      ['santa', 1],
    ])
      assert.equal(all.filter((p) => p.reward === reward).length, count)
    for (const [owner, plan] of Object.entries(draw.plans)) {
      assert.equal(plan.length, 24)
      const items = prizes(plan)
      const count = (id) => items.filter((p) => p.reward === id).length
      assert.ok(owner === 'norsk' ? count('elf') === 7 : count('elf') >= 1 && count('elf') <= 5)
      assert.ok(count('friend-gift') >= 1 && count('friend-gift') <= 3)
      assert.ok(count('self-gift') >= 1 && count('self-gift') <= 3)
      assert.ok(count('banana-large') >= 2)
      if (['mathias', 'tobias frost'].includes(owner))
        assert.equal(items.filter((p) => p.kind === 'physical' || p.reward === 'santa').length, 0)
      if (owner === 'emil') assert.equal(count('cycling-bottle'), 0)
      for (const day of plan)
        if (prizes([day]).some((p) => ['red-wine', 'white-wine'].includes(p.reward)))
          assert.ok(day.day === 23 || day.day === 24)
      assert.equal(JSON.stringify(a.buildAdventPlan(owner, draw)), JSON.stringify(plan))
    }
  }
})

test('all limited prizes may go to the same person and stack without removing guaranteed gifts', () => {
  const { api: a } = harness()
  const draw = a.createAdventDraw(
    [{ name: 'Norsk', createdAt: '2026-11-01T00:00:00Z' }],
    'one-winner',
    now,
  )
  assert.equal(draw.awards.length, 10)
  assert.ok(draw.awards.every((p) => p.winner === 'Norsk'))
  const forced = { ...draw, awards: draw.awards.map((p) => ({ ...p, day: 24 })) }
  const plan = a.buildAdventPlan('Norsk', forced)
  const awards = prizes([plan[23]]).filter((p) =>
    ['mix-max', 'red-wine', 'white-wine', 'cycling-bottle', 'santa'].includes(p.reward),
  )
  assert.equal(awards.length, 10)
})

for (const redis of [false, true])
  test(`cutoff, frozen participants and concurrent initialization (${redis ? 'Redis' : 'local'})`, async () => {
    const { api: a, storage, hashes } = harness(redis)
    assert.equal(await a.ensureAdventDraw(new Date('2026-11-30T22:59:59Z')), undefined)
    assert.equal(storage.size, 0)
    a.listUsers = async () => [...users, { name: 'For sent', createdAt: '2026-11-30T23:00:00Z' }]
    const results = await Promise.all(Array.from({ length: 8 }, () => a.ensureAdventDraw(now)))
    assert.ok(results.every((d) => d.seed === results[0].seed))
    assert.ok(!results[0].participants.includes('For sent'))
    const original = JSON.stringify(results[0])
    a.listUsers = async () => [{ name: 'Ny', createdAt: '2026-11-01T00:00:00Z' }]
    assert.equal(JSON.stringify(await a.ensureAdventDraw(now)), original)
    const late = await a.adventConfigsFor('For sent', now)
    assert.equal(
      prizes(late).filter((p) => p.kind === 'physical' || p.reward === 'santa').length,
      0,
    )
    assert.equal(JSON.stringify(await a.adventConfigsFor('For sent', now)), JSON.stringify(late))
    const dto = a.adventResponse(undefined, now, late)
    assert.ok(dto.doors.every((d) => d.opening === null && d.configured))
    assert.ok(!JSON.stringify(dto).includes(results[0].seed))
    void hashes
  })

test('limited-stock bonuses, negative floors and calendar badges settle exactly once', async () => {
  const { api: a } = harness()
  const draw = a.createAdventDraw(users, 'settlement', now)
  const plan = draw.plans.norsk
  const ctx = { stickers: [], ratings: {}, comments: {} }
  const open = () =>
    a.mutateEconomy('Norsk', (w) => {
      a.settleEconomy(w, 'Norsk', ctx, now)
      for (let day = 1; day <= 24; day++)
        a.openAdventDoor(w, 2026, day, new Date('2026-12-24T03:00:00Z'), plan)
      a.settleEconomy(w, 'Norsk', ctx, new Date('2026-12-24T03:00:00Z'))
    })
  const first = await open(),
    balance = first.record.balance
  await Promise.all([open(), open()])
  const wallet = await a.readEconomy('Norsk')
  assert.equal(wallet.balance, balance)
  assert.equal(Object.keys(wallet.advent[2026]).length, 24)
  const badges = a
    .badgesFor('Norsk', [], {}, { economy: { norsk: a.publicEconomy(wallet) } })
    .filter((b) => b.id.startsWith('advent-'))
  assert.equal(badges.length, 7)
  for (const b of badges)
    assert.equal(b.kind === 'tier' ? b.steps.every((s) => s.points === 1) : b.worth === 1, true)
  assert.equal(badges.find((b) => b.id === 'advent-doors').points, 5)
  assert.ok(!badges.some((b) => b.name === 'Glædelig jul!'))
  assert.equal(a.publicEconomy(wallet).adventPlans, undefined)
})
