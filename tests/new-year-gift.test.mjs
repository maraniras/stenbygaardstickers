import assert from 'node:assert/strict'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'
import { readFileSync } from 'node:fs'
import { setup } from './helpers/economy-harness.mjs'

const at = new Date('2027-01-01T11:00:00Z')
const context = { stickers: [], ratings: {}, comments: {} }

test('new-year gift uses the full January 1 Danish calendar date, not a 04:00 day', () => {
  const { api: a } = setup()
  for (const [time, expected] of [
    ['2026-12-31T22:59:59.999Z', false],
    ['2026-12-31T23:00:00.000Z', true],
    ['2027-01-01T01:00:00.000Z', true],
    ['2027-01-01T22:59:59.999Z', true],
    ['2027-01-01T23:00:00.000Z', false],
    ['2028-01-01T11:00:00.000Z', false],
  ]) {
    const wallet = a.freshEconomy()
    assert.equal(a.claimNewYearGift(wallet, new Date(time)), expected, time)
    assert.equal(wallet.balance, expected ? 500 : 0)
    if (expected) {
      assert.equal(a.claimNewYearGift(wallet, new Date(time)), false)
      assert.equal(wallet.balance, 500)
      assert.equal(wallet.history[0].id, 'new-year:2027')
      assert.equal(wallet.history[0].amount, 500)
    }
  }
})

for (const redis of [false, true])
  test(`only app-open sync grants gift; concurrent devices and retries pay once (${redis ? 'Redis' : 'local'})`, async () => {
    const { api: a } = setup(redis)
    a.Date = class extends Date {
      constructor(value = at) {
        super(value)
      }
      static now() {
        return at.getTime()
      }
    }
    const before = await a.syncEconomy('Nicole', context)
    assert.equal(before.claims['new-year:2027'], undefined, 'background sync does not claim a gift')
    await Promise.all(
      Array.from({ length: 8 }, () => a.syncEconomy('Nicole', context, { appOpenedAt: at })),
    )
    const wallet = await a.readEconomy('Nicole')
    assert.equal(wallet.claims['new-year:2027'], true)
    assert.equal(wallet.history.filter((entry) => entry.id === 'new-year:2027').length, 1)
    assert.equal(wallet.history.find((entry) => entry.id === 'new-year:2027').amount, 500)
    const saved = JSON.stringify(wallet)
    await a.syncEconomy('Nicole', context, { appOpenedAt: at })
    assert.equal(JSON.stringify(await a.readEconomy('Nicole')), saved)
    assert.equal(await a.readEconomy('Someone else'), undefined)
  })

test('app-open endpoint authenticates before claiming and only uses server time and user', async () => {
  const exports = {}
  let calls = 0
  const code = ts.transpileModule(readFileSync('server/api/economy/me.get.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText
  vm.runInNewContext(code, {
    exports,
    defineEventHandler: (handler) => handler,
    Date: class extends Date {
      constructor() {
        super(at)
      }
    },
    economyUser: async (event) => {
      if (!event.authenticated) throw Object.assign(Error('Login required'), { statusCode: 401 })
      return { user: { name: 'Nicole' } }
    },
    syncEconomy: async (name, context, options) => {
      calls++
      assert.equal(name, 'Nicole')
      assert.equal(context, undefined)
      assert.equal(options.appOpenedAt.toISOString(), at.toISOString())
      return { balance: 500 }
    },
    dailyResponse: (record) => record,
  })
  await assert.rejects(exports.default({}), (error) => error.statusCode === 401)
  assert.equal(calls, 0)
  const result = await exports.default({
    authenticated: true,
    body: { name: 'Mathias', date: '2027-01-01', amount: 9999 },
  })
  assert.equal(result.balance, 500)
  assert.equal(calls, 1)
})

test('Christmas theme and calendar stop at Danish midnight while old parcel gifts remain collectable', () => {
  const { api: a } = setup(false, ['server/utils/advent.ts', 'shared/utils/christmas-games.ts'])
  assert.equal(a.themeForDate(new Date('2026-12-31T22:59:59Z')), 'jul')
  assert.equal(a.themeForDate(new Date('2026-12-31T23:00:00Z')), 'normal')
  assert.equal(a.christmasGames(new Date('2026-12-31T23:00:00Z')).boxesOpen, false)
  const wallet = a.freshEconomy()
  const prize = [
    {
      day: 1,
      published: true,
      prize: { kind: 'bananas', amount: 500, title: 'Test', description: '' },
    },
  ]
  assert.throws(
    () => a.openAdventDoor(wallet, 2026, 1, new Date('2026-12-31T23:00:00Z'), prize),
    (error) => error.statusCode === 403,
  )
  assert.equal(wallet.balance, 0)
})
