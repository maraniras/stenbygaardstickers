import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'
import { setup } from './helpers/economy-harness.mjs'

const SECRET = 'roulette-test-secret-not-production'
const BASE = Date.parse('2026-11-14T12:00:00Z')
const OUTSIDE = ['red', 'black', 'green', 'even', 'odd', 'low', 'high']
const GROUPS = ['dozen:1', 'dozen:2', 'dozen:3', 'column:1', 'column:2', 'column:3']
const NUMBERS = ['0', '00', ...Array.from({ length: 36 }, (_, i) => String(i + 1))]
const SPOTS = [...NUMBERS.map((n) => `n:${n}`), ...OUTSIDE, ...GROUPS]
const plain = (value) => JSON.parse(JSON.stringify(value))
const status = (statusCode) => (error) => error.statusCode === statusCode

// Only the VM's Date is replaced: no global clock patch, filesystem or live wallet access.
function harness(remote = false) {
  const h = setup(remote, [
    'shared/utils/roulette.ts',
    'server/utils/roulette.ts',
    'server/utils/slots.ts',
    'server/utils/bananjack.ts',
  ])
  let clock = BASE
  h.api.Date = class extends Date {
    constructor(...args) {
      super(...(args.length ? args : [clock]))
    }
    static now() {
      return clock
    }
  }
  h.api.gameSecret = async () => SECRET
  // syncEconomy closes over economyContext, so stub its data sources, not the global export.
  h.api.listStickers = async () => []
  h.api.publicSticker = (sticker) => sticker
  h.api.ratingsEnabled = false
  h.api.commentStats = async () => ({})
  return { ...h, tick: (value) => (clock = value) }
}
const fresh = (a) => ({ ...a.freshEconomy(), balance: 1000, peakBalance: 1000 })
function request(a, overrides = {}) {
  return a.cleanRouletteRequest({
    id: 'roulette-request-0001',
    round: a.rouletteRoundId(new Date(BASE)),
    revision: 0,
    bets: [{ spot: 'red', amount: 10 }],
    ...overrides,
  })
}
function losingSpot(a, round) {
  return `n:${NUMBERS.find((n) => n !== a.rouletteNumber(round, SECRET))}`
}

test('the chosen American wheel has precisely 38 unique pockets including separate 0 and 00', () => {
  const { api: a } = harness()
  assert.deepEqual([...a.ROULETTE_NUMBERS], NUMBERS)
  assert.equal(a.ROULETTE_WHEEL.length, 38)
  assert.deepEqual([...a.ROULETTE_WHEEL].sort(), [...NUMBERS].sort())
  assert.equal(a.rouletteColour('0'), 'green')
  assert.equal(a.rouletteColour('00'), 'green')
  assert.equal(NUMBERS.filter((n) => a.rouletteColour(n) === 'red').length, 18)
  assert.equal(NUMBERS.filter((n) => a.rouletteColour(n) === 'black').length, 18)
})

test('30-second rounds align at :00/:30 with 20 seconds betting, 6 spinning and 4 result', () => {
  const { api: a } = harness()
  const round = a.rouletteRoundId(new Date(BASE))
  assert.equal(a.rouletteLocksAt(round), BASE + 20_000)
  assert.equal(a.rouletteRevealsAt(round), BASE + 26_000)
  assert.equal(a.rouletteRoundId(new Date(BASE + 29_999)), round)
  assert.equal(a.rouletteRoundId(new Date(BASE + 30_000)), round + 1)
  assert.equal(a.rouletteLocksAt(round + 1), BASE + 50_000)
  assert.equal(a.rouletteRevealsAt(round + 1), BASE + 56_000)
  assert.equal(a.rouletteRoundId(new Date(BASE + 60_000)), round + 2)
})

test('existing minute-round wagers preserve their original deadline, number and one-time payout', async () => {
  const { api: a } = harness(),
    r = fresh(a)
  const oldRound = BASE / 60_000
  const number = a.rouletteNumber(oldRound, SECRET)
  r.balance -= 50
  r.rouletteGame = {
    revision: 1,
    requests: [],
    history: [],
    stats: a.emptyRouletteStats(),
    pending: { round: oldRound, bets: [{ spot: `n:${number}`, amount: 50 }], total: 50 },
  }
  assert.equal(a.roulettePendingRevealsAt(r.rouletteGame.pending), BASE + 55_000)
  for (const offset of [26_000, 30_000, 54_999]) {
    assert.equal(await a.settleRouletteRecord(r, new Date(BASE + offset), SECRET), false)
    assert.equal(r.balance, 950)
  }
  assert.equal(await a.settleRouletteRecord(r, new Date(BASE + 55_000), SECRET), true)
  assert.equal(r.balance, 2750)
  assert.equal(r.rouletteGame.history[0].number, number)
  assert.equal(r.rouletteGame.history[0].at, new Date(BASE + 55_000).toISOString())
  assert.equal(await a.settleRouletteRecord(r, new Date(BASE + 60_000), SECRET), false)
  assert.equal(r.balance, 2750)
})

test('every allowed spot has exact winning pockets, gross multipliers 36/18/3/2 and RTP 36/38', () => {
  const { api: a } = harness()
  const reds = new Set('1 3 5 7 9 12 14 16 18 19 21 23 25 27 30 32 34 36'.split(' '))
  function wins(spot, n) {
    if (spot.startsWith('n:')) return spot.slice(2) === n
    if (spot === 'green') return n === '0' || n === '00'
    if (n === '0' || n === '00') return false
    const x = Number(n)
    if (spot === 'red') return reds.has(n)
    if (spot === 'black') return !reds.has(n)
    if (spot === 'even') return x % 2 === 0
    if (spot === 'odd') return x % 2 === 1
    if (spot === 'low') return x <= 18
    if (spot === 'high') return x >= 19
    if (spot.startsWith('dozen:')) {
      const start = (Number(spot.at(-1)) - 1) * 12 + 1
      return x >= start && x < start + 12
    }
    return (x - Number(spot.at(-1))) % 3 === 0
  }
  for (const spot of SPOTS) {
    assert.equal(a.validRouletteSpot(spot), true, spot)
    const multiplier = spot.startsWith('n:')
      ? 36
      : spot === 'green'
        ? 18
        : GROUPS.includes(spot)
          ? 3
          : 2
    let total = 0
    for (const n of NUMBERS) {
      const expected = wins(spot, n) ? multiplier : 0
      assert.equal(a.rouletteMultiplier(spot, n), expected, `${spot} / ${n}`)
      const payout = a.roulettePayout([{ spot, amount: 5 }], n)
      assert.equal(payout, expected * 5)
      total += payout
    }
    assert.equal(total, 36 * 5, `${spot}: exact aggregate payout over all 38 pockets`)
    assert.equal(total / (38 * 5), 36 / 38, spot)
  }
  assert.equal(a.roulettePayout([{ spot: 'n:00', amount: 5 }], '0'), 0)
  assert.equal(a.roulettePayout([{ spot: 'n:0', amount: 5 }], '00'), 0)
  assert.equal(
    a.roulettePayout(
      [
        { spot: 'red', amount: 5 },
        { spot: 'odd', amount: 10 },
      ],
      '1',
    ),
    30,
  )
})

test('validation accepts 5–50 in steps of five per spot, at most 50 total, and empty cancellation', () => {
  const { api: a } = harness()
  for (const amount of [5, 10, 15, 20, 25, 30, 35, 40, 45, 50])
    assert.equal(request(a, { bets: [{ spot: 'n:00', amount }] }).bets[0].amount, amount)
  assert.equal(request(a, { bets: [] }).bets.length, 0)
  assert.equal(
    request(a, { bets: SPOTS.slice(0, 10).map((spot) => ({ spot, amount: 5 })) }).bets.length,
    10,
  )
  const cleaned = request(a, {
    bets: [
      { spot: 'red', amount: 25, ignored: true },
      { spot: 'black', amount: 25 },
    ],
  })
  assert.deepEqual(plain(cleaned.bets), [
    { spot: 'black', amount: 25 },
    { spot: 'red', amount: 25 },
  ])
})

test('malformed payloads, duplicate spots, unknown bets and excess stakes fail with 400', () => {
  const { api: a } = harness()
  const good = request(a)
  const invalid = [
    null,
    undefined,
    false,
    [],
    {},
    'red',
    ...['', 'short', 'x'.repeat(81), 'spaces are invalid!', 123].map((id) => ({ ...good, id })),
    ...[-1, 0.5, Infinity, NaN, Number.MAX_SAFE_INTEGER + 1, '1', null].flatMap((n) => [
      { ...good, round: n },
      { ...good, revision: n },
    ]),
    ...[null, {}, 'red'].map((bets) => ({ ...good, bets })),
    ...[null, {}, { spot: 1, amount: 5 }].map((bet) => ({ ...good, bets: [bet] })),
    ...[
      'n:37',
      'n:-1',
      'n:01',
      'n:000',
      'n:1.0',
      'dozen:0',
      'dozen:4',
      'column:4',
      'split:1:2',
      'RED',
      '__proto__',
      '',
    ].map((spot) => ({ ...good, bets: [{ spot, amount: 5 }] })),
    ...[-5, 0, 4, 6, 51, 55, 5.5, NaN, Infinity, '5', null].map((amount) => ({
      ...good,
      bets: [{ spot: 'red', amount }],
    })),
    {
      ...good,
      bets: [
        { spot: 'red', amount: 5 },
        { spot: 'red', amount: 5 },
      ],
    },
    {
      ...good,
      bets: [
        { spot: 'red', amount: 50 },
        { spot: 'black', amount: 5 },
      ],
    },
    { ...good, bets: SPOTS.slice(0, 11).map((spot) => ({ spot, amount: 5 })) },
  ]
  for (const body of invalid)
    assert.throws(() => a.cleanRouletteRequest(body), status(400), JSON.stringify(body))
})

test('nonce replay is free even after lock; fingerprint covers round, revision and canonical bets', () => {
  const { api: a } = harness(),
    r = fresh(a)
  const req = request(a, {
    bets: [
      { spot: 'red', amount: 5 },
      { spot: 'black', amount: 10 },
    ],
  })
  a.placeRouletteBets(r, req, new Date(BASE))
  const saved = JSON.stringify(r)
  a.placeRouletteBets(r, request(a, { bets: [...req.bets].reverse() }), new Date(BASE + 30_000))
  assert.equal(JSON.stringify(r), saved)
  for (const change of [
    { round: req.round + 1 },
    { revision: 1 },
    { bets: [{ spot: 'red', amount: 20 }] },
  ])
    assert.throws(() => a.rouletteRequestSaved(r, request(a, change)), status(409))
  for (const revision of [0, 2])
    assert.throws(
      () =>
        a.placeRouletteBets(
          r,
          request(a, { id: 'another-request-0001', revision }),
          new Date(BASE),
        ),
      status(409),
    )
  assert.equal(JSON.stringify(r), saved)
})

test('server accepts 19.999s but rejects exactly 20s, old/future rounds and unresolved prior bets', () => {
  const { api: a } = harness(),
    req = request(a)
  a.placeRouletteBets(fresh(a), req, new Date(BASE + 19_999))
  for (const offset of [20_000, 25_999, 26_000, 30_000, -1]) {
    const r = fresh(a),
      before = JSON.stringify(r)
    assert.throws(() => a.placeRouletteBets(r, req, new Date(BASE + offset)), status(409))
    assert.equal(JSON.stringify(r), before)
  }
  const r = fresh(a)
  a.placeRouletteBets(r, req, new Date(BASE))
  assert.throws(
    () =>
      a.placeRouletteBets(
        r,
        request(a, { id: 'another-request-0001', revision: 1, round: req.round + 1 }),
        new Date(BASE + 30_000),
      ),
    status(409),
  )
})

test('insufficient balance cannot place a stake or consume a nonce', () => {
  const { api: a } = harness(),
    r = fresh(a)
  r.balance = 9
  const before = r.balance
  assert.throws(() => a.placeRouletteBets(r, request(a), new Date(BASE)), status(400))
  assert.equal(r.balance, before)
  assert.equal(r.rouletteGame.requests.length, 0)
  assert.equal(r.rouletteGame.pending, undefined)
})

test('HMAC result agrees with independent protocol vectors for all users and uses rejection sampling', () => {
  const { api: a } = harness()
  for (const [round, secret] of [
    [0, SECRET],
    [1, SECRET],
    [29_911_440, SECRET],
    [29_911_440, 'different-secret'],
  ]) {
    const hash = createHmac('sha256', secret).update(`roulette-v1:${round}:0`).digest()
    const value = hash.readUInt32BE(0)
    assert.ok(value < 4_294_967_290)
    assert.equal(a.rouletteNumber(round, secret), NUMBERS[value % 38])
    assert.equal(a.rouletteNumber(round, secret), a.rouletteNumber(round, secret))
  }
  // An artificial digest exercises the rare rejection path without statistical/flaky assertions.
  const exports = {},
    messages = []
  const code = ts.transpileModule(readFileSync('server/utils/roulette.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText
  vm.runInNewContext(code, {
    exports,
    require: (id) =>
      id === 'node:crypto'
        ? {
            createHmac: () => ({
              update: (message) => {
                messages.push(message)
                return {
                  digest: () => {
                    const b = Buffer.alloc(32, 255)
                    if (messages.length === 2) b.writeUInt32BE(39, 4)
                    return b
                  },
                }
              },
            }),
          }
        : id.includes('shared/utils/roulette')
          ? a
          : {},
  })
  assert.equal(exports.rouletteNumber(123, SECRET), '00')
  assert.deepEqual(messages, ['roulette-v1:123:0', 'roulette-v1:123:1'])
})

test('no settlement at 25.999s; gross payout, net loss, cached receipt and stats commit exactly once at 26s', async () => {
  const { api: a } = harness(),
    r = fresh(a),
    round = a.rouletteRoundId(new Date(BASE))
  const number = a.rouletteNumber(round, SECRET)
  a.placeRouletteBets(
    r,
    request(a, { bets: [{ spot: `n:${number}`, amount: 50 }] }),
    new Date(BASE),
  )
  assert.equal(r.balance, 950)
  const pending = JSON.stringify(r)
  assert.equal(await a.settleRouletteRecord(r, new Date(BASE + 25_999), SECRET), false)
  assert.equal(JSON.stringify(r), pending)
  assert.equal(await a.settleRouletteRecord(r, new Date(BASE + 26_000), SECRET), true)
  assert.equal(r.balance, 2750)
  assert.equal(r.peakBalance, 2750)
  assert.equal(r.rouletteGame.pending, undefined)
  assert.deepEqual(plain(r.rouletteGame.stats), {
    zeroWins: number === '0' || number === '00' ? 1 : 0,
    colourStreak: 0,
    bestColourStreak: 0,
    rounds: 1,
    wins: 1,
    straightWins: 1,
    totalStaked: 50,
    totalPaid: 1800,
    biggestWin: 1750,
    net: 1750,
  })
  assert.deepEqual(plain(r.rouletteGame.history[0]), {
    round,
    number,
    bets: [{ spot: `n:${number}`, amount: 50 }],
    stake: 50,
    payout: 1800,
    net: 1750,
    at: new Date(BASE + 26_000).toISOString(),
  })
  assert.equal(r.casinoDaily.netLoss, -1750)
  assert.equal(
    r.history.reduce((sum, entry) => sum + entry.amount, 0),
    1750,
  )
  const cached = JSON.stringify(r)
  assert.equal(await a.settleRouletteRecord(r, new Date(BASE + 86400_000), 'changed-secret'), false)
  assert.equal(JSON.stringify(r), cached)
})

test('a loss consumes the reservation once, while a returned stake is not a win', async () => {
  const { api: a } = harness(),
    round = a.rouletteRoundId(new Date(BASE))
  for (const bets of [
    [{ spot: losingSpot(a, round), amount: 50 }],
    [
      { spot: 'red', amount: 5 },
      { spot: 'black', amount: 5 },
    ],
  ]) {
    const r = fresh(a)
    a.placeRouletteBets(r, request(a, { bets }), new Date(BASE))
    await a.settleRouletteRecord(r, new Date(BASE + 26_000), SECRET)
    const receipt = r.rouletteGame.history[0]
    if (bets.length === 1) {
      assert.equal(receipt.payout, 0)
      assert.equal(receipt.net, -50)
      assert.equal(r.balance, 950)
      assert.equal(r.history.length, 1)
    } else {
      assert.ok(!['0', '00'].includes(receipt.number), 'fixture must exercise a returned stake')
      assert.equal(receipt.payout, 10)
      assert.equal(receipt.net, 0)
      assert.equal(r.balance, 1000)
    }
    assert.equal(r.balance, 1000 + receipt.net)
    assert.equal(r.casinoDaily.netLoss, -receipt.net || 0)
    assert.equal(a.casinoDailyLimit(r, new Date(BASE + 26_000)).reserved, 0)
    assert.equal(r.rouletteGame.stats.wins, 0)
    assert.equal(
      r.rouletteGame.stats.totalStaked,
      bets.reduce((n, bet) => n + bet.amount, 0),
    )
  }
})

test('replacement only charges its difference; reductions and cancellation refund despite exhausted limit', async () => {
  const { api: a } = harness(),
    r = fresh(a)
  a.placeRouletteBets(r, request(a, { bets: [{ spot: 'red', amount: 50 }] }), new Date(BASE))
  r.casinoDaily.netLoss = 350 // A pre-existing reservation must remain refundable even above cap.
  a.placeRouletteBets(
    r,
    request(a, { id: 'roulette-request-0002', revision: 1, bets: [{ spot: 'black', amount: 25 }] }),
    new Date(BASE + 1000),
  )
  assert.equal(r.balance, 975)
  assert.equal(a.casinoDailyLimit(r, new Date(BASE)).reserved, 25)
  assert.throws(
    () =>
      a.placeRouletteBets(
        r,
        request(a, {
          id: 'roulette-request-0003',
          revision: 2,
          bets: [{ spot: 'black', amount: 30 }],
        }),
        new Date(BASE),
      ),
    status(409),
  )
  a.placeRouletteBets(
    r,
    request(a, { id: 'roulette-request-0004', revision: 2, bets: [] }),
    new Date(BASE + 2000),
  )
  assert.equal(r.balance, 1000)
  assert.equal(a.casinoDailyLimit(r, new Date(BASE)).reserved, 0)
  await a.settleRouletteRecord(r, new Date(BASE + 26_000), SECRET)
  assert.equal(r.rouletteGame.pending, undefined)
  assert.equal(r.rouletteGame.history.length, 0)
  assert.equal(r.rouletteGame.stats.rounds, 0)
  assert.equal(
    r.history.reduce((sum, entry) => sum + entry.amount, 0),
    0,
  )
})

test('shared 300 cap includes actual slots losses, live jack stake and roulette reservation', () => {
  const { api: a } = harness(),
    r = fresh(a),
    now = new Date(BASE)
  for (let i = 1; i <= 10; i++)
    a.spinSlots(
      r,
      { id: `slot-${i}`, sequence: i, previous: i === 1 ? null : `slot-${i - 1}`, bet: 25 },
      now,
      () => 0,
    )
  a.dealJack(r, 'jack-reservation', null, 20, [9, 8, 7, 7, ...Array(100).fill(9)], now)
  assert.equal(r.bananjack.status, 'playing')
  assert.equal(a.casinoDailyLimit(r, now).remaining, 30)
  a.placeRouletteBets(r, request(a, { bets: [{ spot: 'red', amount: 30 }] }), now)
  const limit = a.casinoDailyLimit(r, now)
  assert.equal(limit.netLoss, 250)
  assert.equal(limit.reserved, 50)
  assert.equal(limit.remaining, 0)
  assert.throws(
    () =>
      a.spinSlots(r, { id: 'slot-11', sequence: 11, previous: 'slot-10', bet: 5 }, now, () => 0),
    status(409),
  )
  assert.throws(() => a.actJack(r, 'jack-reservation', 0, 'double', now), status(409))
  a.placeRouletteBets(r, request(a, { id: 'roulette-cancel-0002', revision: 1, bets: [] }), now)
  assert.equal(a.casinoDailyLimit(r, now).remaining, 30)
  a.spinSlots(r, { id: 'slot-11', sequence: 11, previous: 'slot-10', bet: 25 }, now, () => 0)
  assert.equal(a.casinoDailyLimit(r, now).remaining, 5)
})

test('04 Danish rollover including DST settles a long absence on the original reveal day', async () => {
  const { api: a } = harness()
  for (const boundary of ['2026-11-14T03:00:00Z', '2026-03-29T02:00:00Z', '2026-10-25T03:00:00Z']) {
    const reset = Date.parse(boundary),
      placed = new Date(reset - 30_000),
      r = fresh(a)
    const round = a.rouletteRoundId(placed)
    assert.notEqual(a.gameDay(new Date(reset - 1)), a.gameDay(new Date(reset)))
    a.placeRouletteBets(
      r,
      request(a, { round, bets: [{ spot: losingSpot(a, round), amount: 50 }] }),
      placed,
    )
    r.casinoDaily.netLoss = 250
    assert.equal(a.casinoDailyLimit(r, placed).remaining, 0)
    const returned = new Date(reset + 7 * 86400_000)
    await a.settleRouletteRecord(r, returned, SECRET)
    assert.equal(r.casinoDaily.day, a.gameDay(placed))
    assert.equal(r.casinoDaily.netLoss, 300)
    assert.equal(r.rouletteGame.history[0].at, new Date(reset - 4000).toISOString())
    assert.equal(a.casinoDailyLimit(r, returned).remaining, 300)
    a.spinSlots(r, { id: 'new-day-slot', previous: null, sequence: 1, bet: 25 }, returned, () => 0)
    assert.equal(r.casinoDaily.day, a.gameDay(returned))
    assert.equal(r.casinoDaily.netLoss, 25)
    assert.equal(r.balance, 925)
  }
})

for (const remote of [false, true]) {
  test(`wallet CAS: concurrent duplicate submissions and overdue payouts happen once (${remote ? 'Redis' : 'local'})`, async () => {
    const { api: a, tick } = harness(remote)
    await a.mutateEconomy('Test', (r) => Object.assign(r, fresh(a)))
    const round = a.rouletteRoundId(),
      req = request(a, { bets: [{ spot: `n:${a.rouletteNumber(round, SECRET)}`, amount: 10 }] })
    await Promise.all(
      Array.from({ length: 8 }, () => a.mutateEconomy('TEST', (r) => a.placeRouletteBets(r, req))),
    )
    let r = await a.readEconomy('test')
    assert.equal(r.balance, 990)
    assert.equal(r.rouletteGame.revision, 1)
    assert.equal(r.history.length, 1)
    tick(BASE + 26_000)
    await Promise.all(
      Array.from({ length: 8 }, () =>
        a.mutateEconomy('test', (r) => {
          r.balance += 1
        }),
      ),
    )
    r = await a.readEconomy('test')
    assert.equal(r.balance, 1358)
    assert.equal(r.rouletteGame.stats.rounds, 1)
    assert.equal(r.history.filter((e) => e.id.endsWith(':payout')).length, 1)
    assert.equal(r.rouletteGame.history.length, 1)
    assert.equal(r.rouletteGame.pending, undefined)
    await a.mutateEconomy('test', (r) => a.placeRouletteBets(r, req))
    assert.equal((await a.readEconomy('test')).balance, 1358)
  })

  test(`wallet CAS: concurrent revisions have one winner and reserve the shared cap (${remote ? 'Redis' : 'local'})`, async () => {
    const { api: a } = harness(remote)
    await a.mutateEconomy('Test', (r) => {
      Object.assign(r, fresh(a))
      r.casinoDaily = { day: a.gameDay(), netLoss: 275 }
    })
    const results = await Promise.allSettled(
      Array.from({ length: 8 }, (_, i) =>
        a.mutateEconomy('Test', (r) =>
          a.placeRouletteBets(
            r,
            request(a, {
              id: `roulette-device-000${i}`,
              bets: [{ spot: i % 2 ? 'red' : 'black', amount: 25 }],
            }),
          ),
        ),
      ),
    )
    assert.equal(results.filter((v) => v.status === 'fulfilled').length, 1)
    for (const result of results.filter((v) => v.status === 'rejected'))
      assert.equal(result.reason.statusCode, 409)
    const r = await a.readEconomy('Test')
    assert.equal(r.balance, 975)
    assert.equal(r.rouletteGame.revision, 1)
    assert.equal(a.casinoDailyLimit(r).remaining, 0)
  })

  test(`public balance fetch settles absent players once without a participant index (${remote ? 'Redis' : 'local'})`, async () => {
    const { api: a, tick } = harness(remote)
    const round = a.rouletteRoundId()
    const req = request(a, { bets: [{ spot: `n:${a.rouletteNumber(round, SECRET)}`, amount: 10 }] })
    for (const name of ['Alice', 'Bob'])
      await a.mutateEconomy(name, (r) => {
        Object.assign(r, fresh(a))
        a.placeRouletteBets(r, req)
      })
    tick(BASE + 25_999)
    assert.equal((await a.publicEconomies()).alice.balance, 990)
    tick(BASE + 10 * 86400_000)
    const results = await Promise.all(Array.from({ length: 5 }, () => a.publicEconomies()))
    for (const result of results)
      for (const name of ['alice', 'bob']) {
        assert.equal(result[name].balance, 1350)
        assert.equal(result[name].roulette.rounds, 1)
        assert.equal(Object.hasOwn(result[name], 'rouletteGame'), false)
      }
    for (const name of ['alice', 'bob']) {
      const r = await a.readEconomy(name)
      assert.equal(r.rouletteGame.pending, undefined)
      assert.equal(r.rouletteGame.history.length, 1)
      assert.equal(a.casinoDailyLimit(r).remaining, 300)
    }
  })

  test(`competing roulette and slots cannot jointly exceed shared cap (${remote ? 'Redis' : 'local'})`, async () => {
    const { api: a } = harness(remote)
    await a.mutateEconomy('Test', (r) => {
      Object.assign(r, fresh(a))
      r.casinoDaily = { day: a.gameDay(), netLoss: 275 }
    })
    const results = await Promise.allSettled([
      a.mutateEconomy('Test', (r) =>
        a.placeRouletteBets(r, request(a, { bets: [{ spot: 'red', amount: 25 }] })),
      ),
      a.mutateEconomy('Test', (r) =>
        a.spinSlots(
          r,
          { id: 'competing-slot', previous: null, sequence: 1, bet: 25 },
          undefined,
          () => 0,
        ),
      ),
    ])
    assert.equal(results.filter((v) => v.status === 'fulfilled').length, 1)
    assert.equal(results.find((v) => v.status === 'rejected').reason.statusCode, 409)
    const r = await a.readEconomy('Test')
    assert.equal(r.balance, 975)
    assert.equal(a.casinoDailyLimit(r).remaining, 0)
    assert.equal(a.casinoDailyLimit(r).netLoss + a.casinoDailyLimit(r).reserved, 300)
  })

  test(`auto-settlement precedes a new day slots mutation after long absence (${remote ? 'Redis' : 'local'})`, async () => {
    const { api: a, tick } = harness(remote)
    const round = a.rouletteRoundId()
    await a.mutateEconomy('Test', (r) => {
      Object.assign(r, fresh(a))
      a.placeRouletteBets(r, request(a, { bets: [{ spot: losingSpot(a, round), amount: 50 }] }))
      r.casinoDaily.netLoss = 250
    })
    tick(BASE + 30 * 86400_000)
    await a.mutateEconomy('Test', (r) =>
      a.spinSlots(
        r,
        { id: 'after-long-absence', previous: null, sequence: 1, bet: 25 },
        undefined,
        () => 0,
      ),
    )
    const r = await a.readEconomy('Test')
    assert.equal(r.balance, 925)
    assert.equal(r.rouletteGame.stats.net, -50)
    assert.equal(r.rouletteGame.history[0].at, new Date(BASE + 26_000).toISOString())
    assert.equal(r.casinoDaily.day, a.gameDay())
    assert.equal(r.casinoDaily.netLoss, 25)
    assert.equal(a.casinoDailyLimit(r).remaining, 275)
  })
}

test('local commit checks the deadline after mutation and leaves persisted wallet untouched', async () => {
  const { api: a, tick } = harness()
  await a.mutateEconomy('Test', (r) => Object.assign(r, fresh(a)))
  const before = JSON.stringify(await a.readEconomy('Test'))
  tick(BASE + 19_999)
  await assert.rejects(
    a.mutateEconomy(
      'Test',
      (r) => {
        a.placeRouletteBets(r, request(a))
        tick(BASE + 20_000)
      },
      { before: BASE + 20_000 },
    ),
    status(409),
  )
  assert.equal(JSON.stringify(await a.readEconomy('Test')), before)
})

test('Redis deadline protocol passes fourth ARGV, handles -1 and guards with server TIME before HSET', async () => {
  const { api: a } = harness(true)
  let calls = 0
  a.redisEval = async (script, keys, args) => {
    calls++
    assert.equal(script, a.ECONOMY_CAS)
    assert.deepEqual([...keys], ['economy'])
    assert.equal(args[3], String(BASE + 20_000))
    assert.equal(JSON.parse(args[2]).balance, 123)
    return -1
  }
  await assert.rejects(
    a.mutateEconomy(
      'Test',
      (r) => {
        r.balance = 123
      },
      { before: BASE + 20_000 },
    ),
    status(409),
  )
  assert.equal(calls, 1)
  assert.equal(await a.readEconomy('Test'), undefined)
  // The existing harness implements CAS, not Lua. Guard the actual server-side clock logic explicitly.
  assert.match(a.ECONOMY_CAS, /redis\.call\('TIME'\)/)
  assert.match(
    a.ECONOMY_CAS,
    /tonumber\(clock\[1\]\) \* 1000 \+ math\.floor\(tonumber\(clock\[2\]\) \/ 1000\) >= tonumber\(ARGV\[4\]\) then return -1/,
  )
  assert.ok(a.ECONOMY_CAS.indexOf('return -1') < a.ECONOMY_CAS.indexOf("redis.call('HSET'"))
})

test('public view hides the current result before 26s, shares results, and exposes no wallet, nonce or secret', async () => {
  const { api: a, tick } = harness()
  let settled = 0
  const onSettled = async () => {
    settled++
  }
  await a.mutateEconomy('Alice', (r) => {
    Object.assign(r, fresh(a))
    a.placeRouletteBets(r, request(a))
  })
  await a.mirrorRoulettePlayer('Alice', await a.readEconomy('Alice'))
  // The wallet remains authoritative even if the eventual participant mirror is missing.
  for (const [offset, phase] of [
    [0, 'betting'],
    [19_999, 'betting'],
    [20_000, 'spinning'],
    [25_999, 'spinning'],
    [26_000, 'result'],
  ]) {
    tick(BASE + offset)
    const publicView = await a.rouletteView(),
      mine = await a.rouletteView('Alice', onSettled)
    assert.equal(settled, offset >= 26_000 ? 1 : 0)
    assert.equal(publicView.round.phase, phase)
    assert.equal(Object.hasOwn(publicView.round, 'result'), offset >= 26_000)
    assert.equal(Object.hasOwn(publicView, 'me'), false)
    assert.deepEqual(Object.keys(publicView).sort(), ['players', 'recent', 'round', 'serverTime'])
    assert.deepEqual(Object.keys(publicView.players[0]).sort(), ['bets', 'name', 'total'])
    assert.equal(publicView.recent.length, 10)
    assert.ok(publicView.recent.every((item) => item.round < publicView.round.id))
    assert.deepEqual(plain(publicView.round), plain(mine.round))
    assert.deepEqual(plain(publicView.recent), plain(mine.recent))
    assert.equal(JSON.stringify(publicView).includes(SECRET), false)
    assert.equal(JSON.stringify(publicView).includes('fingerprint'), false)
    if (offset < 26_000) assert.equal(mine.me.last, undefined)
    else assert.equal(mine.me.last.number, publicView.round.result)
  }
  await a.rouletteView('Alice', onSettled)
  assert.equal(settled, 1)
})

test('participant mirror rejects older revisions and cancellation removes a player from public view', async () => {
  const { api: a } = harness(),
    r = fresh(a)
  a.placeRouletteBets(r, request(a), new Date(BASE))
  const older = plain(r)
  a.placeRouletteBets(
    r,
    request(a, { id: 'roulette-request-0002', revision: 1, bets: [] }),
    new Date(BASE),
  )
  await Promise.all([a.mirrorRoulettePlayer('Alice', r), a.mirrorRoulettePlayer('Alice', older)])
  assert.equal((await a.rouletteView()).players.length, 0)
})

function route(method, globals) {
  const exports = {}
  vm.runInNewContext(
    ts.transpileModule(readFileSync(`server/api/games/roulette.${method}.ts`, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText,
    {
      exports,
      defineEventHandler: (handler) => handler,
      ...globals,
    },
  )
  return exports.default
}

test('GET is public and no-store; authenticated GET passes only the token owner name', async () => {
  for (const found of [undefined, { user: { name: 'Alice' } }]) {
    const calls = [],
      event = {}
    const handler = route('get', {
      setHeader: (e, key, value) => {
        assert.equal(e, event)
        calls.push([key, value])
      },
      readToken: () => 'device-token',
      userForToken: async (token) => {
        assert.equal(token, 'device-token')
        return found
      },
      rouletteView: async (name) => ({ owner: name ?? null }),
    })
    assert.deepEqual(plain(await handler(event)), { owner: found?.user.name ?? null })
    assert.deepEqual(calls, [['Cache-Control', 'no-store']])
  }
})

test('POST requires auth before reading a body; saved retry avoids another wallet transaction', async () => {
  const denied = route('post', {
    economyUser: async () => {
      throw Object.assign(new Error('auth'), { statusCode: 401 })
    },
    readBody: () => assert.fail('body read before auth'),
  })
  await assert.rejects(denied({}), status(401))
  const { api: a } = harness(),
    r = fresh(a),
    req = request(a)
  a.placeRouletteBets(r, req)
  const calls = []
  const retry = route('post', {
    economyUser: async () => ({ user: { name: 'Alice' } }),
    readBody: async () => req,
    cleanRouletteRequest: a.cleanRouletteRequest,
    rouletteRequestSaved: a.rouletteRequestSaved,
    readEconomy: async () => r,
    mirrorRoulettePlayer: async (name) => calls.push(name),
    rouletteView: async (name) => ({ name }),
    economyContext: () => assert.fail('retry must not mutate wallet'),
    mutateEconomy: () => assert.fail('retry must not mutate wallet'),
  })
  assert.deepEqual(plain(await retry({})), { name: 'Alice' })
  assert.deepEqual(calls, ['Alice'])
})

test('POST wires the lock deadline into the wallet commit and mirrors only its committed record', async () => {
  const { api: a } = harness(),
    calls = [],
    committed = fresh(a),
    req = request(a)
  const handler = route('post', {
    economyUser: async () => ({ user: { name: 'Alice' } }),
    readBody: async () => req,
    cleanRouletteRequest: a.cleanRouletteRequest,
    readEconomy: async () => undefined,
    rouletteRequestSaved: a.rouletteRequestSaved,
    rouletteLocksAt: a.rouletteLocksAt,
    economyContext: async () => ({ secret: SECRET }),
    settleEconomy: () => calls.push('economy'),
    placeRouletteBets: (r, request) => {
      calls.push('bet')
      a.placeRouletteBets(r, request)
    },
    mutateEconomy: async (name, change, options) => {
      assert.equal(name, 'Alice')
      assert.equal(options.before, BASE + 20_000)
      change(committed)
      calls.push('commit')
      return { record: committed }
    },
    mirrorRoulettePlayer: async (name, r) => {
      assert.equal(name, 'Alice')
      assert.equal(r, committed)
      calls.push('mirror')
    },
    rouletteView: async () => {
      calls.push('view')
      return {}
    },
  })
  await handler({})
  assert.deepEqual(calls, ['economy', 'bet', 'commit', 'mirror', 'view'])
})

// Search future deterministic rounds with the test-only secret; never stub the settlement result.
function colourRounds(a, r) {
  let previous = a.rouletteRoundId(new Date(BASE)) - 1
  function next(matches) {
    for (let round = previous + 1; round < previous + 10_000; round++) {
      const number = a.rouletteNumber(round, SECRET)
      if (matches(number)) return round
    }
    assert.fail('No matching deterministic roulette round in fixture range')
  }
  return {
    async play(matches, betsFor) {
      const round = next(matches),
        number = a.rouletteNumber(round, SECRET)
      previous = round
      a.placeRouletteBets(
        r,
        request(a, {
          id: `roulette-streak-${round}`,
          round,
          revision: r.rouletteGame?.revision ?? 0,
          bets: betsFor(number),
        }),
        new Date(round * 30_000),
      )
      const at = new Date(a.rouletteRevealsAt(round))
      assert.equal(await a.settleRouletteRecord(r, at, SECRET), true)
      return at
    },
    win(colour) {
      return this.play(
        (n) => a.rouletteColour(n) === colour,
        () => [{ spot: colour, amount: 5 }],
      )
    },
    skip() {
      previous = next(() => true)
      return previous
    },
  }
}
function colourBadges(a, r) {
  return a
    .badgesFor(
      'Test',
      [],
      {},
      {
        economy: r ? { test: a.publicEconomy(r) } : {},
      },
    )
    .filter((badge) => badge.id.startsWith('roulette-colour-'))
}

test('alternating red/black wins unlock colour badges exactly at 5/10 with 2/4 points', async () => {
  const { api: a } = harness(),
    r = fresh(a),
    rounds = colourRounds(a, r)
  assert.equal(colourBadges(a).length, 2)
  assert.ok(colourBadges(a).every((b) => !b.earned && b.points === 0))
  for (let count = 1; count <= 11; count++) {
    const at = await rounds.win(count % 2 ? 'red' : 'black')
    assert.equal(r.rouletteGame.stats.colourStreak, count)
    assert.equal(r.rouletteGame.stats.bestColourStreak, count)
    assert.equal(r.rouletteGame.stats.rounds, count)
    const badges = colourBadges(a, r)
    assert.deepEqual(plain(badges.map((b) => b.id)), [
      'roulette-colour-five',
      'roulette-colour-ten',
    ])
    for (const [index, target, points] of [
      [0, 5, 2],
      [1, 10, 4],
    ]) {
      const badge = badges[index]
      assert.equal(badge.earned, count >= target)
      assert.equal(badge.points, count >= target ? points : 0)
      assert.equal(badge.worth, points)
      assert.deepEqual(plain(badge.progress), { value: Math.min(count, target), target })
    }
    const before = JSON.stringify(r)
    assert.equal(await a.settleRouletteRecord(r, at, SECRET), false)
    assert.equal(
      await a.settleRouletteRecord(r, new Date(at.getTime() + 86_400_000), SECRET),
      false,
    )
    assert.equal(JSON.stringify(r), before, 'repeated settlement cannot increment a streak twice')
  }
})

test('losses, both zero pockets, break-even and non-colour wins reset only the current streak', async (t) => {
  const cases = [
    [
      'colour loss',
      (a, n) => a.rouletteColour(n) === 'red',
      () => [{ spot: 'black', amount: 5 }],
      -5,
    ],
    ['zero', (_a, n) => n === '0', () => [{ spot: 'red', amount: 5 }], -5],
    ['double zero', (_a, n) => n === '00', () => [{ spot: 'black', amount: 5 }], -5],
    [
      'break-even',
      (a, n) => a.rouletteColour(n) === 'red',
      () => [
        { spot: 'red', amount: 5 },
        { spot: 'black', amount: 5 },
      ],
      0,
    ],
    [
      'non-colour win',
      (a, n) => a.rouletteColour(n) === 'black',
      (n) => [{ spot: `n:${n}`, amount: 5 }],
      175,
    ],
    [
      'winning colour with overall net loss',
      (a, n) => a.rouletteColour(n) === 'red',
      () => [
        { spot: 'red', amount: 5 },
        { spot: 'n:0', amount: 15 },
      ],
      -10,
    ],
  ]
  for (const [label, matches, bets, net] of cases)
    await t.test(label, async () => {
      const { api: a } = harness(),
        r = fresh(a),
        rounds = colourRounds(a, r)
      for (let i = 0; i < 5; i++) await rounds.win(i % 2 ? 'red' : 'black')
      await rounds.play((n) => matches(a, n), bets)
      assert.equal(r.rouletteGame.history[0].net, net)
      assert.equal(r.rouletteGame.stats.colourStreak, 0)
      assert.equal(r.rouletteGame.stats.bestColourStreak, 5)
      assert.equal(colourBadges(a, r)[0].earned, true, 'an earned badge survives a broken streak')
      await rounds.win('red')
      assert.equal(r.rouletteGame.stats.colourStreak, 1)
      assert.equal(r.rouletteGame.stats.bestColourStreak, 5)
    })
})

test('skipped rounds and explicitly cancelled no-bet rounds preserve the colour streak', async () => {
  const { api: a } = harness(),
    r = fresh(a),
    rounds = colourRounds(a, r)
  await rounds.win('red')
  await rounds.win('black')
  const skipped = rounds.skip()
  const before = JSON.stringify(r)
  assert.equal(
    await a.settleRouletteRecord(r, new Date(a.rouletteRevealsAt(skipped)), SECRET),
    false,
  )
  assert.equal(JSON.stringify(r), before)
  await rounds.play(
    () => true,
    () => [],
  )
  assert.equal(r.rouletteGame.stats.rounds, 2)
  assert.equal(r.rouletteGame.stats.colourStreak, 2)
  assert.equal(r.rouletteGame.stats.bestColourStreak, 2)
  await rounds.win('red')
  assert.equal(r.rouletteGame.stats.colourStreak, 3)
})

test('legacy roulette stats without optional streak fields settle safely from zero', async () => {
  for (const winning of [true, false]) {
    const { api: a } = harness(),
      r = fresh(a)
    const stats = plain(a.emptyRouletteStats())
    delete stats.colourStreak
    delete stats.bestColourStreak
    r.rouletteGame = { revision: 0, history: [], requests: [], stats }
    assert.ok(colourBadges(a, r).every((b) => !b.earned && b.points === 0))
    const rounds = colourRounds(a, r)
    await rounds.play(
      (n) => a.rouletteColour(n) === 'red',
      () => [{ spot: winning ? 'red' : 'black', amount: 5 }],
    )
    assert.equal(stats.colourStreak, winning ? 1 : 0)
    assert.equal(stats.bestColourStreak, winning ? 1 : 0)
    assert.ok(Object.values(stats).every(Number.isFinite))
    await rounds.win('black')
    assert.equal(stats.colourStreak, winning ? 2 : 1)
  }
})

test('settleEconomy credits 50/150 once at colour streak milestones, including after re-earning', async () => {
  const { api: a } = harness(),
    r = fresh(a),
    rounds = colourRounds(a, r)
  const empty = { stickers: [], ratings: {}, comments: {} }
  const rewards = () => r.history.filter((entry) => entry.id.startsWith('badge:roulette-colour-'))
  a.settleEconomy(r, 'Test', empty, new Date(BASE))
  const milestones = new Map()
  for (let count = 1; count <= 11; count++) {
    const at = await rounds.win(count % 2 ? 'red' : 'black')
    a.settleEconomy(r, 'Test', empty, at)
    for (const [target, id, amount] of [
      [5, 'roulette-colour-five', 50],
      [10, 'roulette-colour-ten', 150],
    ]) {
      const entries = rewards().filter((entry) => entry.id === `badge:${id}`)
      assert.equal(entries.length, count >= target ? 1 : 0)
      assert.equal(r.claims[`badge:${id}`] ?? false, count >= target)
      if (count === target) milestones.set(id, at.toISOString())
      if (count >= target) {
        assert.equal(entries[0].amount, amount)
        assert.equal(r.milestones[id], milestones.get(id))
      }
    }
    const saved = JSON.stringify(r)
    a.settleEconomy(r, 'Test', empty, at)
    assert.equal(JSON.stringify(r), saved, 'repeat economy settlement cannot credit twice')
  }
  await rounds.play(
    (n) => n === '00',
    () => [{ spot: 'red', amount: 5 }],
  )
  assert.equal(r.rouletteGame.stats.colourStreak, 0)
  for (let count = 1; count <= 10; count++) {
    const at = await rounds.win(count % 2 ? 'black' : 'red')
    const balance = r.balance
    a.settleEconomy(r, 'Test', empty, at)
    assert.equal(r.balance, balance, 're-earning a colour badge gives no further reward')
  }
  assert.equal(rewards().length, 2)
  assert.equal(
    rewards().reduce((sum, entry) => sum + entry.amount, 0),
    200,
  )
  for (const [id, at] of milestones) assert.equal(r.milestones[id], at)
})

test('roulette tiers use exact round/win thresholds and each tier pays once', () => {
  const { api: a } = harness(),
    r = fresh(a)
  r.rouletteGame = { revision: 0, history: [], requests: [], stats: a.emptyRouletteStats() }
  const context = { stickers: [], ratings: {}, comments: {} }
  for (const [id, field, thresholds, rewards] of [
    ['roulette-rounds', 'rounds', [1, 10, 50, 100, 250], [10, 20, 40, 75, 150]],
    ['roulette-wins', 'wins', [1, 10, 25, 50, 100], [10, 25, 50, 100, 200]],
  ]) {
    for (let i = 0; i < thresholds.length; i++) {
      const get = () =>
        a
          .badgesFor('Test', [], {}, { economy: { test: a.publicEconomy(r) } })
          .find((b) => b.id === id)
      r.rouletteGame.stats[field] = thresholds[i] - 1
      assert.equal(get().level, i)
      r.rouletteGame.stats[field]++
      assert.equal(get().level, i + 1)
      assert.equal(get().points, ((i + 1) * (i + 2)) / 2)
      assert.equal(a.bananaRewardFor(get(), i + 1), rewards[i])
      a.settleEconomy(r, 'Test', context, new Date(BASE))
      assert.equal(r.history.filter((h) => h.id === `badge:${id}:${i + 1}`).length, 1)
      const balance = r.balance
      a.settleEconomy(r, 'Test', context, new Date(BASE))
      assert.equal(r.balance, balance)
    }
  }
})

test('single roulette badges require an exact-number win, a zero win or 500 net; rewards do not duplicate', async () => {
  const { api: a } = harness(),
    r = fresh(a),
    rounds = colourRounds(a, r)
  const context = { stickers: [], ratings: {}, comments: {} }
  const get = (id) =>
    a.badgesFor('Test', [], {}, { economy: { test: a.publicEconomy(r) } }).find((b) => b.id === id)
  assert.equal(get('roulette-straight').earned, false)
  assert.equal(get('roulette-zero').earned, false)
  assert.equal(get('roulette-big-win').earned, false)
  for (const number of ['0', '00']) {
    const at = await rounds.play(
      (n) => n === number,
      () => [{ spot: `n:${number}`, amount: 5 }],
    )
    assert.equal(r.rouletteGame.stats.zeroWins, number === '0' ? 1 : 2)
    assert.equal(get('roulette-zero').earned, true)
    assert.equal(get('roulette-straight').earned, true)
    assert.equal(get('roulette-big-win').earned, false, '175 net is below 500')
    const before = JSON.stringify(r.rouletteGame.stats)
    assert.equal(await a.settleRouletteRecord(r, at, SECRET), false)
    assert.equal(JSON.stringify(r.rouletteGame.stats), before)
    a.settleEconomy(r, 'Test', context, at)
  }
  r.rouletteGame.stats.biggestWin = 499
  assert.equal(get('roulette-big-win').earned, false)
  r.rouletteGame.stats.biggestWin = 500
  assert.equal(get('roulette-big-win').earned, true)
  a.settleEconomy(r, 'Test', context, new Date(BASE))
  for (const [id, amount, points] of [
    ['roulette-straight', 25, 1],
    ['roulette-zero', 50, 2],
    ['roulette-big-win', 100, 3],
  ]) {
    assert.equal(get(id).points, points)
    const claims = r.history.filter((h) => h.id === `badge:${id}`)
    assert.equal(claims.length, 1)
    assert.equal(claims[0].amount, amount)
  }
  const balance = r.balance
  a.settleEconomy(r, 'Test', context, new Date(BASE))
  assert.equal(r.balance, balance)
})

test('legacy zero counters start safely and losing zero bets or outside wins do not count', async () => {
  const { api: a } = harness(),
    r = fresh(a),
    rounds = colourRounds(a, r)
  r.rouletteGame = { revision: 0, history: [], requests: [], stats: a.emptyRouletteStats() }
  delete r.rouletteGame.stats.zeroWins
  await rounds.play(
    (n) => n !== '0',
    () => [{ spot: 'n:0', amount: 5 }],
  )
  assert.equal(r.rouletteGame.stats.zeroWins ?? 0, 0)
  await rounds.win('red')
  assert.equal(r.rouletteGame.stats.zeroWins ?? 0, 0)
  await rounds.play(
    (n) => n === '00',
    () => [{ spot: 'n:00', amount: 5 }],
  )
  assert.equal(r.rouletteGame.stats.zeroWins, 1)
})

test('50 chip and combined green bet settle both zeros at 18x gross, without straight-number badges', async () => {
  const { api: a } = harness()
  assert.deepEqual([...a.ROULETTE_CHIPS], [5, 10, 25, 50])
  assert.equal(a.rouletteSpotLabel('green'), 'Grøn · 0 + 00')
  for (const number of ['0', '00', '1']) {
    const r = fresh(a),
      rounds = colourRounds(a, r)
    const at = await rounds.play(
      (n) => n === number,
      () => [{ spot: 'green', amount: 50 }],
    )
    const won = number !== '1'
    assert.equal(r.balance, won ? 1850 : 950)
    assert.equal(r.rouletteGame.history[0].payout, won ? 900 : 0)
    assert.equal(r.rouletteGame.history[0].net, won ? 850 : -50)
    assert.equal(r.rouletteGame.stats.wins, won ? 1 : 0)
    assert.equal(r.rouletteGame.stats.straightWins, 0)
    assert.equal(r.rouletteGame.stats.zeroWins, 0)
    assert.equal(r.rouletteGame.stats.colourStreak, 0)
    const before = JSON.stringify(r)
    assert.equal(await a.settleRouletteRecord(r, at, SECRET), false)
    assert.equal(JSON.stringify(r), before)
  }
  assert.throws(
    () =>
      request(a, {
        bets: [
          { spot: 'green', amount: 50 },
          { spot: 'red', amount: 5 },
        ],
      }),
    status(400),
  )
})
