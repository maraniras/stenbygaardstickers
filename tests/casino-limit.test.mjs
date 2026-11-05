import assert from 'node:assert/strict'
import test from 'node:test'
import { setup } from './helpers/economy-harness.mjs'
const harness = (remote = false) =>
  setup(remote, ['server/utils/bananjack.ts', 'server/utils/slots.ts']).api
const now = new Date('2026-11-05T12:00:00Z')
const deck = (...cards) => [...cards, ...Array(100).fill(9)]
const fresh = (a, netLoss = 0, at = now) => ({
  ...a.freshEconomy(),
  balance: 5000,
  peakBalance: 5000,
  casinoDaily: { day: a.gameDay(at), netLoss },
})
const spin = (a, r, bet = 10, ticket = 0, at = now) =>
  a.spinSlots(
    r,
    {
      id: `spin-${(r.slotGame?.last.sequence ?? 0) + 1}`,
      previous: r.slotGame?.last.id ?? null,
      sequence: (r.slotGame?.last.sequence ?? 0) + 1,
      bet,
    },
    at,
    () => ticket,
  )

test('one net-loss cap spans games; pending hands reserve risk and can finish at the cap', () => {
  const a = harness(),
    r = fresh(a, 250)
  a.dealJack(r, 'round-a', null, 50, deck(9, 9, 6, 7), now)
  assert.equal(a.casinoDailyLimit(r, now).reserved, 50)
  assert.equal(a.slotResponse(r, now).dailyLimit.remaining, 0)
  const saved = JSON.stringify(r)
  assert.throws(() => spin(a, r), { statusCode: 409 })
  assert.throws(() => a.actJack(r, 'round-a', 0, 'split', now), { statusCode: 400 })
  assert.equal(JSON.stringify(r), saved)
  a.actJack(r, 'round-a', 0, 'stand', now)
  assert.equal(r.bananjack.status, 'finished')
  assert.equal(a.casinoDailyLimit(r, now).netLoss, 300)
  assert.equal(a.casinoDailyLimit(r, now).reserved, 0)
  assert.throws(() => spin(a, r), { statusCode: 409 })
  assert.throws(() => a.dealJack(r, 'round-b', 'round-a', 10, deck(), now), { statusCode: 409 })
})

test('profits expand the cap, refunds restore risk and unrelated credits do not', () => {
  const a = harness(),
    r = fresh(a, 290)
  a.dealJack(r, 'push', null, 10, deck(9, 9, 6, 6), now)
  assert.equal(a.casinoDailyLimit(r, now).remaining, 0)
  a.actJack(r, 'push', 0, 'stand', now)
  assert.equal(a.casinoDailyLimit(r, now).remaining, 10)
  for (let i = 0; i < 100; i++) spin(a, r, 10, 6500)
  assert.equal(a.casinoDailyLimit(r, now).netLoss, 290)
  r.balance += 500
  r.history.unshift({ id: 'badge:example', amount: 500, label: 'Badge', at: now.toISOString() })
  assert.equal(a.casinoDailyLimit(r, now).remaining, 10)
  spin(a, r, 10, 9400)
  assert.equal(a.casinoDailyLimit(r, now).netLoss, 250)
  assert.equal(a.casinoDailyLimit(r, now).remaining, 50)
  const winner = fresh(a)
  spin(a, winner, 25, 9990)
  assert.equal(a.casinoDailyLimit(winner, now).netLoss, -2475)
  assert.equal(a.casinoDailyLimit(winner, now).remaining, 2775)
})

test('double and split reserve extra stakes once and cannot overrun shared remaining risk', () => {
  const a = harness(),
    doubled = fresh(a, 260)
  a.dealJack(doubled, 'double', null, 20, deck(4, 8, 5, 7, 9), now)
  a.actJack(doubled, 'double', 0, 'double', now)
  assert.equal(a.casinoDailyLimit(doubled, now).reserved, 0)
  assert.equal(a.casinoDailyLimit(doubled, now).netLoss, 220)
  const snapshot = JSON.stringify(doubled)
  a.actJack(doubled, 'double', 0, 'double', now)
  assert.equal(JSON.stringify(doubled), snapshot)
  const split = fresh(a, 280)
  a.dealJack(split, 'split', null, 10, deck(7, 9, 59, 6, 2, 3, 1), now)
  a.actJack(split, 'split', 0, 'split', now)
  assert.equal(a.casinoDailyLimit(split, now).reserved, 20)
  assert.equal(a.casinoDailyLimit(split, now).remaining, 0)
  assert.ok(!a.jackPublic(split, now).actions.includes('double'))
  const before = JSON.stringify(split)
  assert.throws(() => a.actJack(split, 'split', 1, 'double', now), { statusCode: 409 })
  assert.equal(JSON.stringify(split), before)
  a.actJack(split, 'split', 1, 'stand', now)
  a.actJack(split, 'split', 2, 'stand', now)
  assert.equal(split.bananjack.status, 'finished')
  assert.ok(a.casinoDailyLimit(split, now).netLoss <= 300)
})

test('04:00 resets settled loss including DST, while active risk carries over until settlement', () => {
  const a = harness()
  for (const boundary of ['2026-11-05T03:00:00Z', '2026-03-29T02:00:00Z', '2026-10-25T03:00:00Z']) {
    const after = new Date(boundary),
      before = new Date(after.getTime() - 1),
      r = fresh(a, 280, before)
    a.dealJack(r, 'overnight', null, 20, deck(4, 8, 5, 7, 9), before)
    assert.equal(a.casinoDailyLimit(r, before).remaining, 0)
    assert.equal(a.casinoDailyLimit(r, before).nextResetAt, after.toISOString())
    assert.equal(a.casinoDailyLimit(r, after).netLoss, 0)
    assert.equal(a.casinoDailyLimit(r, after).remaining, 280)
    a.actJack(r, 'overnight', 0, 'double', after)
    assert.equal(a.casinoDailyLimit(r, after).netLoss, -40)
    assert.equal(a.casinoDailyLimit(r, after).remaining, 340)
    assert.equal(r.casinoDaily.day, a.gameDay(after))
  }
})

test('legacy gross counters migrate once, excluding badges and separating pending risk', () => {
  const a = harness(),
    r = fresh(a)
  delete r.casinoDaily
  r.jackDailyWagers = { day: a.gameDay(now), amount: 100 }
  r.slotGame = { daily: { day: a.gameDay(now), spent: 50 } }
  r.history = [
    ['bananjack:old:payout', 80],
    ['slots:1:payout', 20],
    ['badge:welcome', 250],
  ].map(([id, amount]) => ({ id, amount, at: now.toISOString(), label: id }))
  assert.equal(a.casinoDailyLimit(r, now).netLoss, 50)
  a.prepareCasinoDay(r, now)
  r.history = []
  assert.equal(a.casinoDailyLimit(r, now).netLoss, 50)
  const active = fresh(a)
  a.dealJack(active, 'legacy-active', null, 20, deck(9, 9, 6, 7), now)
  delete active.casinoDaily
  active.jackDailyWagers = { day: a.gameDay(now), amount: 100 }
  assert.equal(a.casinoDailyLimit(active, now).netLoss, 80)
  assert.equal(a.casinoDailyLimit(active, now).reserved, 20)
  a.actJack(active, 'legacy-active', 0, 'stand', now)
  assert.equal(a.casinoDailyLimit(active, now).netLoss, 100)
})

for (const remote of [false, true])
  test(`competing games/devices share one CAS-protected cap (${remote ? 'Redis' : 'local'})`, async () => {
    const a = harness(remote)
    await a.mutateEconomy('Test', (r) => Object.assign(r, fresh(a, 290)))
    const results = await Promise.allSettled(
      Array.from({ length: 8 }, (_, i) =>
        a.mutateEconomy('Test', (r) => {
          if (i % 2) a.dealJack(r, `round-${i}`, null, 10, deck(9, 9, 6, 7), now)
          else spin(a, r)
        }),
      ),
    )
    assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1)
    const saved = await a.readEconomy('Test')
    assert.equal(a.casinoDailyLimit(saved, now).remaining, 0)
    assert.equal(saved.balance, 4990)
    assert.equal(saved.history.filter((entry) => entry.amount < 0).length, 1)
  })
