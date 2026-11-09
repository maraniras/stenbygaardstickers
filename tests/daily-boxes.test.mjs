import assert from 'node:assert/strict'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'
import { readFileSync } from 'node:fs'
import { setup } from './helpers/economy-harness.mjs'

const day = '2026-11-20',
  now = new Date(`${day}T12:00:00Z`)
const context = { stickers: [], ratings: {}, comments: {} }
const harness = (redis = false) => setup(redis, ['server/utils/daily-boxes.ts'])

for (const redis of [false, true])
  test(`shared board stays private, stable and identical across simultaneous requests (${redis ? 'Redis' : 'local'})`, async () => {
    const { api: a } = harness(redis)
    const boards = await Promise.all(Array.from({ length: 8 }, () => a.dailyBoxesBoard(day)))
    for (const board of boards) assert.equal(JSON.stringify(board), JSON.stringify(boards[0]))
    const board = boards[0]
    assert.equal(board.length, 12)
    assert.equal(board.filter((p) => p.kind === 'bananas').length, 6)
    assert.equal(board.filter((p) => p.kind === 'elf').length, 3)
    assert.equal(board.filter((p) => p.kind === 'nit').length, 3)
    assert.deepEqual(
      Array.from(board.map((p) => p.amount)).sort((a, b) => a - b),
      [-40, -25, -10, 0, 0, 0, 5, 10, 15, 25, 50, 100],
    )
    assert.notEqual(JSON.stringify(await a.dailyBoxesBoard('2026-11-21')), JSON.stringify(board))
    const wallet = a.freshEconomy()
    assert.equal((await a.dailyResponse(wallet, day)).boxes, null)
    a.applyBoxesPick(wallet, day, [0, 1, 2], board, now)
    const response = await a.dailyResponse(wallet, day)
    assert.equal(response.boxes.prizes.length, 3)
    assert.equal(response.board, undefined)
    assert.equal(response.wallet.days, undefined)
    assert.equal(response.boxes.prizes[0].amount, board[0].amount)
  })

for (const redis of [false, true])
  test(`concurrent devices commit one selection and payout, retries restore it (${redis ? 'Redis' : 'local'})`, async () => {
    const { api: a } = harness(redis)
    const board = await a.dailyBoxesBoard(day)
    await a.mutateEconomy('Mathias', (wallet) => a.settleEconomy(wallet, 'Mathias', context, now))
    const before = (await a.readEconomy('Mathias')).balance
    await Promise.all(
      [
        [0, 1, 2],
        [3, 4, 5],
        [9, 10, 11],
      ].map((choices) =>
        a.mutateEconomy('Mathias', (wallet) => a.applyBoxesPick(wallet, day, choices, board, now)),
      ),
    )
    let wallet = await a.readEconomy('Mathias')
    const saved = JSON.stringify(wallet.days[day].boxes)
    assert.equal(wallet.balance, before + wallet.days[day].boxes.amount)
    assert.ok(wallet.claims[`boxes:${day}`])
    assert.equal(
      wallet.history.filter((entry) => entry.id === `boxes:${day}`).length,
      wallet.days[day].boxes.amount === 0 ? 0 : 1,
    )
    await a.mutateEconomy('Mathias', (wallet) =>
      a.applyBoxesPick(wallet, day, [6, 7, 8], board, now),
    )
    wallet = await a.readEconomy('Mathias')
    assert.equal(JSON.stringify(wallet.days[day].boxes), saved)
    assert.equal(wallet.balance, before + wallet.days[day].boxes.amount)
    const other = a.freshEconomy()
    other.balance = 250
    a.applyBoxesPick(other, day, [0, 1, 2], board, now)
    assert.equal(JSON.stringify(other.days[day].boxes.prizes), JSON.stringify(board.slice(0, 3)))
  })

test('invalid choices and stale days cannot mutate wallets; losses floor at zero and do not affect casino limits', () => {
  const { api: a } = harness()
  const board = a.BOX_PRIZES
  const wallet = a.freshEconomy()
  wallet.balance = 12
  wallet.peakBalance = 12
  const before = JSON.stringify(wallet)
  for (const choices of [
    null,
    [],
    [0, 1],
    [0, 1, 2, 3],
    [0, 0, 1],
    [-1, 1, 2],
    [0, 1, 12],
    [0, 1, 1.5],
    ['0', 1, 2],
  ]) {
    assert.throws(() => a.applyBoxesPick(wallet, day, choices, board, now), { statusCode: 400 })
    assert.equal(JSON.stringify(wallet), before)
  }
  assert.throws(() => a.applyBoxesPick(wallet, '2026-11-19', [0, 1, 2], board, now), {
    statusCode: 409,
  })
  assert.equal(JSON.stringify(wallet), before)
  const loss = a.applyBoxesPick(wallet, day, [6, 7, 8], board, now)
  assert.equal(loss.nominal, -75)
  assert.equal(loss.amount, -12)
  assert.equal(wallet.balance, 0)
  assert.equal(wallet.casinoDaily, undefined)
  assert.equal(wallet.history[0].amount, -12)
  const tomorrow = '2026-11-21'
  a.applyBoxesPick(wallet, tomorrow, [9, 10, 11], board, new Date(`${tomorrow}T12:00:00Z`))
  assert.equal(wallet.days[tomorrow].boxes.amount, 0)
  assert.ok(wallet.claims[`boxes:${tomorrow}`])
})

test('a preserved payout claim prevents another reward after a local attempt-only reset', () => {
  const { api: a } = harness()
  const wallet = a.freshEconomy()
  wallet.balance = 250
  a.applyBoxesPick(wallet, day, [0, 1, 2], a.BOX_PRIZES, now)
  const before = wallet.balance
  delete wallet.days[day]
  a.applyBoxesPick(wallet, day, [3, 4, 5], a.BOX_PRIZES, now)
  assert.equal(wallet.balance, before)
  assert.equal(wallet.days[day].boxes.amount, 0)
})

test('POST authenticates before reading choices; dates, amounts and user identity cannot be forged', async () => {
  const { api: a } = harness()
  let allowed = false,
    reads = 0,
    body = { day, choices: [0, 1, 2], amount: 999999, name: 'Nicole' }
  const exports = {}
  vm.runInNewContext(
    ts.transpileModule(readFileSync('server/api/games/boxes.post.ts', 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText,
    {
      ...a,
      exports,
      require: () => a,
      defineEventHandler: (fn) => fn,
      Date: class extends Date {
        constructor(value = now) {
          super(value)
        }
      },
      gameDay: () => day,
      economyUser: async () => {
        if (!allowed) throw Object.assign(Error('Login'), { statusCode: 401 })
        return { user: { name: 'Mathias' } }
      },
      readBody: async () => {
        reads++
        return body
      },
      setHeader() {},
      economyContext: async () => context,
      dailyBoxesBoard: async () => a.BOX_PRIZES,
      syncBadgesLater: async () => {},
    },
  )
  await assert.rejects(() => exports.default({}), { statusCode: 401 })
  assert.equal(reads, 0)
  allowed = true
  body.day = '2026-11-19'
  await assert.rejects(() => exports.default({}), { statusCode: 409 })
  body.day = day
  body.choices = [1, 1, 1]
  await assert.rejects(() => exports.default({}), { statusCode: 400 })
  assert.equal(await a.readEconomy('Mathias'), undefined)
  body.choices = [0, 1, 2]
  const response = await exports.default({})
  assert.equal(response.boxes.amount, 30)
  assert.equal(response.wallet.balance, 300)
  assert.equal(await a.readEconomy('Nicole'), undefined)
  body.choices = [3, 4, 5]
  const retry = await exports.default({})
  assert.equal(retry.wallet.balance, response.wallet.balance)
  assert.equal(JSON.stringify(retry.boxes), JSON.stringify(response.boxes))
})
