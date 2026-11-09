import assert from 'node:assert/strict'
import test from 'node:test'
import { setup } from './helpers/economy-harness.mjs'
import vm from 'node:vm'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

function harness(redis = false) {
  const result = setup(redis, ['server/utils/advent.ts'])
  result.api.structuredClone = structuredClone
  result.api.process = { env: { NODE_ENV: 'production', VERCEL_ENV: 'production' } }
  return result
}
const prize = (day, amount = 50) => [
  {
    day,
    published: true,
    prize: { kind: 'bananas', amount, title: 'Julebananer', description: 'En lille julehilsen' },
  },
]
const ready = new Date('2026-12-24T03:00:00Z')

test('each calendar door unlocks at 04:00 Danish time; missed doors stay available', () => {
  const { api: a } = harness()
  for (const [time, available] of [
    ['2026-11-30T23:00:00Z', 0],
    ['2026-12-01T02:59:59Z', 0],
    ['2026-12-01T03:00:00Z', 1],
    ['2026-12-10T02:59:59Z', 9],
    ['2026-12-10T03:00:00Z', 10],
    ['2026-12-24T03:00:00Z', 24],
    ['2027-01-01T12:00:00Z', 24],
  ])
    assert.equal(a.adventAvailableDay(2026, new Date(time)), available)
  assert.equal(a.adventUnlockAt(2026, 24), '2026-12-24T03:00:00.000Z')
  const wallet = a.freshEconomy()
  a.openAdventDoor(wallet, 2026, 1, ready, prize(1))
  assert.equal(wallet.balance, 50)
})

test('server rejects early openings and drafts without consuming a claim or changing the wallet', () => {
  const { api: a } = harness(),
    wallet = a.freshEconomy(),
    before = JSON.stringify(wallet)
  assert.throws(
    () => a.openAdventDoor(wallet, 2026, 1, new Date('2026-12-01T02:59:59Z'), prize(1)),
    (e) => e.statusCode === 403,
  )
  assert.throws(
    () => a.openAdventDoor(wallet, 2026, 1, ready),
    (e) => e.statusCode === 409,
  )
  for (const day of [0, 25, '1', null, 1.5])
    assert.throws(
      () => a.openAdventDoor(wallet, 2026, day, ready),
      (e) => e.statusCode === 400,
    )
  assert.throws(
    () => a.openAdventDoor(wallet, 2027, 1, ready),
    (e) => e.statusCode === 400,
  )
  assert.equal(JSON.stringify(wallet), before)
  assert.equal(a.adventResponse(wallet, ready).doors.filter((x) => x.configured).length, 0)
  assert.equal(a.adventResponse(wallet, ready).previewAllowed, false)
  a.process.env.NODE_ENV = 'development'
  assert.equal(a.adventResponse(wallet, ready).previewAllowed, false)
})

test('POST authenticates first and ignores supplied dates, preview flags and prize amounts', async () => {
  const { api: a } = harness()
  const wallet = a.freshEconomy(),
    before = JSON.stringify(wallet)
  let authenticated = false,
    reads = 0,
    committed = false
  const exports = {}
  vm.runInNewContext(
    ts.transpileModule(readFileSync('server/api/games/advent.post.ts', 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    {
      exports,
      defineEventHandler: (fn) => fn,
      economyUser: async () => {
        if (!authenticated) throw Object.assign(new Error('Login required'), { statusCode: 401 })
        return { user: { name: 'Test' } }
      },
      readBody: async () => {
        reads++
        return { year: 2026, day: 1, preview: true, now: '2026-12-25T12:00:00Z', amount: 100000 }
      },
      economyContext: async () => ({}),
      adventConfigsFor: async () => undefined,
      settleEconomy() {},
      Date: class extends Date {
        constructor() {
          super('2026-12-01T02:59:59Z')
        }
      },
      openAdventDoor: a.openAdventDoor,
      mutateEconomy: async (_name, change) => {
        change(wallet)
        committed = true
        return { record: wallet }
      },
      syncBadgesLater: async () => {},
      adventResponse: a.adventResponse,
    },
  )
  await assert.rejects(
    () => exports.default({}),
    (e) => e.statusCode === 401,
  )
  assert.equal(reads, 0)
  authenticated = true
  await assert.rejects(
    () => exports.default({}),
    (e) => e.statusCode === 403,
  )
  assert.equal(committed, false)
  assert.equal(JSON.stringify(wallet), before)
})

test('positive rewards, prize text and physical fulfilment are snapshotted once per person', () => {
  const { api: a } = harness(),
    wallet = a.freshEconomy(),
    configs = prize(1, 150)
  const opened = a.openAdventDoor(wallet, 2026, 1, ready, configs)
  configs[0].prize.amount = 999
  configs[0].prize.title = 'Changed later'
  const again = a.openAdventDoor(wallet, 2026, 1, ready, configs)
  assert.equal(wallet.balance, 150)
  assert.equal(wallet.history.length, 1)
  assert.equal(again.prize.amount, 150)
  assert.equal(opened.prize.title, 'Julebananer')
  a.openAdventDoor(wallet, 2026, 2, ready, [
    {
      day: 2,
      published: true,
      prize: {
        kind: 'physical',
        title: 'En rigtig sticker',
        description: 'Et særligt motiv',
        instructions: 'Kontakt admin',
      },
    },
  ])
  assert.equal(wallet.advent['2026']['2'].fulfilment, 'pending')
  a.openAdventDoor(wallet, 2026, 3, ready, [
    {
      day: 3,
      published: true,
      prize: { kind: 'surprise', title: 'En overraskelse', description: 'Noget helt fjerde' },
    },
  ])
  assert.equal(wallet.balance, 150)
  assert.equal(a.adventResponse(wallet, ready).doors[1].opening.prize.kind, 'physical')
  assert.equal(a.adventResponse(a.freshEconomy(), ready).doors[1].opening, null)
})

test('banana losses stop at zero and do not count as casino losses', () => {
  const { api: a } = harness(),
    wallet = a.freshEconomy()
  wallet.balance = 20
  wallet.peakBalance = 100
  wallet.casinoDaily = { day: '2026-12-24', netLoss: 220 }
  const opened = a.openAdventDoor(wallet, 2026, 1, ready, prize(1, -50))
  assert.equal(opened.amount, -20)
  assert.equal(wallet.balance, 0)
  assert.equal(wallet.history[0].amount, -20)
  assert.equal(wallet.peakBalance, 100)
  assert.equal(wallet.casinoDaily.netLoss, 220)
  a.openAdventDoor(wallet, 2026, 2, ready, prize(2, -50))
  assert.equal(wallet.advent['2026']['2'].amount, 0)
  assert.equal(wallet.balance, 0)
})

for (const redis of [false, true])
  test(`concurrent devices commit one opening and payout (${redis ? 'Redis CAS' : 'local queue'})`, async () => {
    const { api: a } = harness(redis)
    await a.mutateEconomy('Test', (r) => {
      r.balance = 100
    })
    await Promise.all(
      Array.from({ length: 8 }, () =>
        a.mutateEconomy('Test', (r) => a.openAdventDoor(r, 2026, 1, ready, prize(1, 30))),
      ),
    )
    const wallet = await a.readEconomy('Test')
    assert.equal(wallet.balance, 130)
    assert.equal(wallet.history.length, 1)
    assert.equal(Object.keys(wallet.advent['2026']).length, 1)
    assert.equal(wallet.claims['advent:2026:1'], true)
  })
