import assert from 'node:assert/strict'
import test from 'node:test'
import { setup } from './helpers/economy-harness.mjs'
const harness = (remote) => setup(remote, ['server/utils/bananjack.ts']).api
const now = new Date('2026-10-31T12:00:00Z')
const deck = (...cards) => [...cards, ...Array(100).fill(9)]
const fresh = (a, spent = 0) => ({
  ...a.freshEconomy(),
  balance: 5000,
  peakBalance: 5000,
  jackDailyWagers: { day: a.gameDay(now), amount: spent },
})

test('gross stakes reach exactly 1000; rejected wagers and retries never charge again', () => {
  const a = harness(false),
    r = fresh(a, 990)
  const original = JSON.stringify(r)
  assert.throws(() => a.dealJack(r, 'a', null, 20, deck(9, 8, 7, 7), now), { statusCode: 409 })
  assert.equal(JSON.stringify(r), original)
  a.dealJack(r, 'a', null, 10, deck(9, 8, 7, 7), now)
  assert.equal(a.jackDailyLimit(r, now).remaining, 0)
  const dealt = JSON.stringify(r)
  a.dealJack(r, 'a', null, 10, deck(), now)
  assert.equal(JSON.stringify(r), dealt)
  assert.deepEqual(Array.from(a.jackPublic(r, now).actions), ['hit', 'stand'])
  assert.throws(() => a.actJack(r, 'a', 0, 'double', now), { statusCode: 409 })
  assert.equal(JSON.stringify(r), dealt)
  a.actJack(r, 'a', 0, 'stand', now)
  assert.equal(r.bananjack.status, 'finished')
  assert.equal(r.balance, 5010)
  assert.equal(a.jackDailyLimit(r, now).spent, 1000)
  assert.throws(() => a.dealJack(r, 'b', 'a', 10, deck(), now), { statusCode: 409 })
})

test('split and double reserve extra stakes once; hit/stand remain available at the cap', () => {
  const a = harness(false)
  const doubled = fresh(a, 960)
  a.dealJack(doubled, 'double', null, 20, deck(4, 8, 5, 7, 9), now)
  a.actJack(doubled, 'double', 0, 'double', now)
  assert.equal(a.jackDailyLimit(doubled, now).spent, 1000)
  const saved = JSON.stringify(doubled)
  a.actJack(doubled, 'double', 0, 'double', now)
  assert.equal(JSON.stringify(doubled), saved)
  const split = fresh(a, 980)
  a.dealJack(split, 'split', null, 10, deck(7, 9, 59, 6, 2, 3, 1), now)
  a.actJack(split, 'split', 0, 'split', now)
  assert.equal(a.jackDailyLimit(split, now).spent, 1000)
  const state = JSON.stringify(split)
  a.actJack(split, 'split', 0, 'split', now)
  assert.equal(JSON.stringify(split), state)
  assert.ok(!a.jackPublic(split, now).actions.includes('double'))
  a.actJack(split, 'split', 1, 'hit', now)
  a.actJack(split, 'split', 2, 'stand', now)
  a.actJack(split, 'split', 3, 'stand', now)
  assert.equal(split.bananjack.status, 'finished')
  const blocked = fresh(a, 990)
  a.dealJack(blocked, 'blocked', null, 10, deck(7, 9, 59, 6), now)
  const before = JSON.stringify(blocked)
  assert.throws(() => a.actJack(blocked, 'blocked', 0, 'split', now), { statusCode: 409 })
  assert.equal(JSON.stringify(blocked), before)
})

test('push refunds and unrelated badge credits do not replenish allowance', () => {
  const a = harness(false),
    r = fresh(a, 990)
  a.dealJack(r, 'push', null, 10, deck(9, 9, 6, 6), now)
  a.actJack(r, 'push', 0, 'stand', now)
  assert.equal(r.balance, 5000)
  assert.equal(a.jackDailyLimit(r, now).remaining, 0)
  r.balance += 500
  r.history.unshift({ id: 'badge:example', amount: 500, at: now.toISOString(), label: 'Badge' })
  assert.equal(a.jackDailyLimit(r, now).remaining, 0)
  r.history = []
  assert.equal(a.jackDailyLimit(r, now).spent, 1000)
})

test('allowance resets at Danish 04:00, also on DST transition dates; a hand can span the reset', () => {
  const a = harness(false)
  for (const boundary of ['2026-10-31T03:00:00Z', '2026-03-29T02:00:00Z', '2026-10-25T03:00:00Z']) {
    const after = new Date(boundary),
      before = new Date(after.getTime() - 1),
      r = fresh(a)
    r.jackDailyWagers = { day: a.gameDay(before), amount: 980 }
    a.dealJack(r, 'overnight', null, 10, deck(4, 8, 5, 7, 9), before)
    assert.equal(a.jackDailyLimit(r, before).nextResetAt, boundary.replace('Z', '.000Z'))
    assert.equal(a.jackDailyLimit(r, before).spent, 990)
    assert.equal(a.jackDailyLimit(r, after).spent, 0)
    a.actJack(r, 'overnight', 0, 'double', after)
    assert.equal(a.jackDailyLimit(r, after).spent, 10)
    assert.equal(r.jackDailyWagers.day, a.gameDay(after))
  }
})

test('legacy bootstrap counts only today negative Bananjack entries and persists beyond history trimming', () => {
  const a = harness(false),
    r = fresh(a)
  delete r.jackDailyWagers
  r.history = [
    ['bananjack:a:bet', -20, now],
    ['bananjack:a:double:1', -20, now],
    ['bananjack:b:split:1', -10, now],
    ['bananjack:a:payout', 80, now],
    ['other:bet', -50, now],
    ['badge:x', 100, now],
    ['bananjack:y:bet', -50, new Date('2026-10-30T12:00:00Z')],
  ].map(([id, amount, at]) => ({ id, amount, at: at.toISOString(), label: id }))
  assert.equal(a.jackDailyLimit(r, now).spent, 50)
  a.dealJack(r, 'new', null, 10, deck(9, 8, 7, 7), now)
  r.history = []
  assert.equal(a.jackDailyLimit(r, now).spent, 60)
})

for (const remote of [false, true])
  test(`simultaneous devices cannot exceed shared budget (${remote ? 'Redis CAS' : 'local'})`, async () => {
    const a = harness(remote)
    await a.mutateEconomy('Test', (r) => Object.assign(r, fresh(a, 990)))
    const results = await Promise.allSettled(
      Array.from({ length: 8 }, (_, i) =>
        a.mutateEconomy('Test', (r) =>
          a.dealJack(r, `round-${i}`, null, 10, deck(9, 8, 7, 7), now),
        ),
      ),
    )
    assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1)
    const r = await a.readEconomy('Test')
    assert.equal(a.jackDailyLimit(r, now).spent, 1000)
    assert.equal(r.balance, 4990)
    assert.equal(r.history.filter((t) => t.amount < 0).length, 1)
  })
