import assert from 'node:assert/strict'
import test from 'node:test'
import vm from 'node:vm'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { setup } from './helpers/economy-harness.mjs'
const harness = (remote = false) =>
  setup(remote, ['shared/utils/slots.ts', 'shared/utils/slotBadges.ts', 'server/utils/slots.ts'])
    .api
const now = new Date('2026-11-02T12:00:00Z')
const empty = { stickers: [], ratings: {}, comments: {} }
const fresh = (a) => ({ ...a.freshEconomy(), balance: 5000, peakBalance: 5000 })
const request = (r, bet = 10) => ({
  id: `spin-request-${(r.slotGame?.last.sequence ?? 0) + 1}`,
  previous: r.slotGame?.last.id ?? null,
  sequence: (r.slotGame?.last.sequence ?? 0) + 1,
  bet,
})

test('all 10000 tickets give exactly 94 percent RTP and the agreed probabilities', () => {
  const a = harness(),
    counts = new Map()
  let payout = 0
  for (let ticket = 0; ticket < 10000; ticket++) {
    const p = a.slotPrizeFor(ticket)
    payout += p.multiplier
    counts.set(p.multiplier, (counts.get(p.multiplier) ?? 0) + 1)
  }
  assert.deepEqual(
    [...counts],
    [
      [0, 6500],
      [1, 2000],
      [2, 900],
      [5, 380],
      [10, 170],
      [25, 40],
      [100, 10],
    ],
  )
  assert.equal(payout / 10000, 0.94)
  assert.equal(a.SLOT_RTP, 94)
  for (const ticket of [-1, 10000, NaN, Infinity, 0.5]) assert.throws(() => a.slotPrizeFor(ticket))
})
test('persisted reel symbols agree with payouts, net stats and ledger including returned stake', () => {
  const a = harness()
  for (const [ticket, multiplier, symbol] of [
    [0, 0, null],
    [6500, 1, null],
    [8500, 2, 'strawberry'],
    [9400, 5, 'lemon'],
    [9780, 10, 'mix-max'],
    [9950, 25, 'faxe-kondi'],
    [9990, 100, 'crowned-banana'],
  ]) {
    const r = fresh(a),
      req = request(r, 25)
    const spin = a.spinSlots(r, req, now, () => ticket)
    assert.equal(r.balance, 4975 + multiplier * 25)
    assert.equal(spin.payout, multiplier * 25)
    assert.equal(r.slotGame.stats.net, (multiplier - 1) * 25)
    assert.equal(
      r.history.reduce((s, t) => s + t.amount, 0),
      (multiplier - 1) * 25,
    )
    const unique = new Set(spin.reels)
    assert.equal(unique.size, multiplier === 0 ? 3 : multiplier === 1 ? 2 : 1)
    if (symbol) assert.deepEqual(Array.from(spin.reels), [symbol, symbol, symbol])
    const saved = JSON.stringify(r)
    a.spinSlots(r, req, now, () => {
      throw Error('Retry must not redraw')
    })
    assert.equal(JSON.stringify(r), saved)
    assert.equal(a.slotResponse(JSON.parse(saved), now).spin.id, spin.id)
  }
})
test('the last five bananas of wallet and daily budget can fund a minimum spin', () => {
  const a = harness(),
    r = fresh(a)
  a.spinSlots(r, request(r, 25), now, () => 6500)
  r.slotGame.daily.spent = 495
  r.balance = 5
  a.spinSlots(r, request(r, 5), now, () => 0)
  assert.equal(r.balance, 0)
  assert.equal(r.slotGame.last.bet, 5)
  assert.equal(a.slotResponse(r, now).dailyLimit.remaining, 0)
})

test('invalid, unfunded, stale and over-budget wagers never debit, draw or change stats', () => {
  const a = harness()
  for (const bet of [0, 1, 11, -5, 26, 30, 50, NaN, Infinity]) {
    const r = fresh(a),
      before = JSON.stringify(r)
    assert.throws(() => a.spinSlots(r, request(r, bet), now), { statusCode: 400 })
    assert.equal(JSON.stringify(r), before)
  }
  const r = fresh(a)
  for (let i = 0; i < 20; i++) a.spinSlots(r, request(r, 25), now, () => 6500)
  assert.equal(a.slotResponse(r, now).dailyLimit.remaining, 0)
  assert.equal(r.balance, 5000)
  const saved = JSON.stringify(r)
  assert.throws(
    () =>
      a.spinSlots(r, request(r), now, () => {
        throw Error('Must not draw')
      }),
    { statusCode: 409 },
  )
  assert.equal(JSON.stringify(r), saved)
  assert.throws(() => a.spinSlots(r, { ...request(r), previous: null }, now), { statusCode: 409 })
  assert.throws(() => a.spinSlots(r, { ...request(r), sequence: 1 }, now), { statusCode: 409 })
  assert.throws(() => a.spinSlots(r, { ...request(r), id: r.slotGame.last.id }, now), {
    statusCode: 409,
  })
  const poor = fresh(a)
  poor.balance = 0
  assert.throws(() => a.spinSlots(poor, request(poor), now), { statusCode: 400 })
})
test('profit streaks exclude refunds; big wins and jackpot count once with exact badge rewards', () => {
  const a = harness(),
    r = fresh(a)
  for (const ticket of [8500, 9780, 9990]) a.spinSlots(r, request(r), now, () => ticket)
  assert.equal(r.slotGame.stats.bestProfitStreak, 3)
  assert.equal(r.slotGame.stats.wins, 3)
  assert.equal(r.slotGame.stats.bigWins, 2)
  assert.equal(r.slotGame.stats.jackpots, 1)
  a.spinSlots(r, request(r), now, () => 6500)
  assert.equal(r.slotGame.stats.profitStreak, 0)
  a.settleEconomy(r, 'Test', empty, now)
  const balance = r.balance,
    claims = Object.keys(r.claims).length
  a.settleEconomy(r, 'Test', empty, now)
  assert.equal(r.balance, balance)
  assert.equal(Object.keys(r.claims).length, claims)
  const wallet = {
    balance: 0,
    peakBalance: 0,
    milestones: {},
    stats: a.emptyDailyStats(),
    slots: {
      spins: 2000,
      wins: 500,
      bigWins: 75,
      jackpots: 1,
      profitStreak: 3,
      bestProfitStreak: 3,
      net: 0,
    },
  }
  const badges = a
    .badgesFor('Test', [], {}, { economy: { test: wallet } })
    .filter((b) => b.id.startsWith('slot-'))
  assert.equal(badges.length, 5)
  assert.equal(a.totalPoints(badges), 52)
  assert.equal(
    badges.reduce(
      (sum, b) =>
        sum +
        Array.from({ length: b.level }, (_, i) => a.bananaRewardFor(b, i + 1)).reduce(
          (x, y) => x + y,
          0,
        ),
      0,
    ),
    1385,
  )
})
test('daily allowance resets at Danish 04:00 including DST; old outcomes remain recoverable', () => {
  const a = harness()
  for (const boundary of ['2026-11-02T03:00:00Z', '2026-03-29T02:00:00Z', '2026-10-25T03:00:00Z']) {
    const after = new Date(boundary),
      before = new Date(after.getTime() - 1),
      r = fresh(a)
    for (let i = 0; i < 20; i++) a.spinSlots(r, request(r, 25), before, () => 6500)
    assert.equal(a.slotResponse(r, before).dailyLimit.remaining, 0)
    assert.equal(a.slotResponse(r, after).dailyLimit.remaining, 500)
    const last = r.slotGame.last
    a.spinSlots(
      r,
      { id: last.id, sequence: last.sequence, bet: last.bet, previous: null },
      after,
      () => {
        throw Error('No redraw')
      },
    )
    assert.equal(a.slotResponse(r, after).dailyLimit.remaining, 500)
    a.spinSlots(r, request(r), after, () => 0)
    assert.equal(a.slotResponse(r, after).dailyLimit.spent, 10)
  }
})
for (const remote of [false, true])
  test(`simultaneous devices and retries share one wallet and daily allowance (${remote ? 'Redis' : 'local'})`, async () => {
    const a = harness(remote),
      r = fresh(a)
    a.spinSlots(r, request(r, 25), now, () => 0)
    r.slotGame.daily.spent = 490
    await a.mutateEconomy('Test', (saved) => Object.assign(saved, r))
    const before = await a.readEconomy('Test'),
      req = request(before)
    const out = await Promise.allSettled(
      Array.from({ length: 8 }, (_, i) =>
        a.mutateEconomy('Test', (saved) =>
          a.spinSlots(saved, { ...req, id: `competing-${i}` }, now, () => 9999),
        ),
      ),
    )
    assert.equal(out.filter((v) => v.status === 'fulfilled').length, 1)
    const saved = await a.readEconomy('Test')
    assert.equal(saved.slotGame.stats.spins, 2)
    assert.equal(saved.slotGame.stats.jackpots, 1)
    assert.equal(a.slotResponse(saved, now).dailyLimit.remaining, 0)
    const balance = saved.balance,
      last = saved.slotGame.last
    await Promise.all(
      Array.from({ length: 5 }, () =>
        a.mutateEconomy('Test', (s) => a.spinSlots(s, { ...req, id: last.id }, now)),
      ),
    )
    assert.equal((await a.readEconomy('Test')).balance, balance)
  })
for (const method of ['get', 'post'])
  test(`disabled-feature guard rejects slots ${method} before wallet access`, async () => {
    const exports = {}
    vm.runInNewContext(
      ts.transpileModule(readFileSync(`server/api/games/slots.${method}.ts`, 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS },
      }).outputText,
      {
        exports,
        require: () => ({}),
        defineEventHandler: (fn) => fn,
        useRuntimeConfig: () => ({ public: { banandittenEnabled: false } }),
        createError: (e) => Object.assign(new Error(), e),
        economyUser: () => {
          throw Error('Unexpected wallet access')
        },
      },
    )
    await assert.rejects(exports.default({}), { statusCode: 403 })
  })
