import assert from 'node:assert/strict'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'
import { readFileSync } from 'node:fs'
import { setup } from './helpers/economy-harness.mjs'

const context = { stickers: [], ratings: {}, comments: {} }
const day = '2026-11-20',
  now = new Date(`${day}T12:00:00Z`)
const harness = () => setup(false, ['server/utils/daily-boxes.ts'])

test('Christmas season uses Danish dates, opens at04 and closes at midnight after31December, every year', () => {
  const { api: a } = harness()
  for (const [stamp, active] of [
    ['2026-11-09T12:00:00Z', false],
    ['2026-11-19T23:00:00Z', false],
    ['2026-11-20T02:59:59Z', false],
    ['2026-11-20T03:00:00Z', true],
    ['2026-12-31T22:59:59Z', true],
    ['2026-12-31T23:00:00Z', false],
    ['2027-01-01T02:59:59Z', false],
    ['2027-06-01T12:00:00Z', false],
    ['2027-11-20T03:00:00Z', true],
  ])
    assert.equal(a.boxesSeason(new Date(stamp)).active, active, stamp)
})

test('off-season POST is rejected before reading choices or touching the wallet', async () => {
  const { api: a } = harness(),
    exports = {}
  let reads = 0,
    writes = 0
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
        constructor(value = '2026-11-09T12:00:00Z') {
          super(value)
        }
      },
      economyUser: async () => ({ user: { name: 'Mathias' } }),
      readBody: async () => {
        reads++
        return { day: '2026-11-09', choices: [0, 1, 2], preview: true }
      },
      mutateEconomy: async () => {
        writes++
      },
    },
  )
  await assert.rejects(() => exports.default({}), { statusCode: 403 })
  assert.equal(reads, 0)
  assert.equal(writes, 0)
  const wallet = a.freshEconomy(),
    before = JSON.stringify(wallet)
  assert.throws(
    () =>
      a.applyBoxesPick(
        wallet,
        '2026-12-31',
        [0, 1, 2],
        a.BOX_PRIZES,
        new Date('2026-12-31T23:00:00Z'),
      ),
    { statusCode: 403 },
  )
  assert.equal(JSON.stringify(wallet), before)
})

test('each combination earns its correct permanent badge, one point and20 bananas exactly once', () => {
  const { api: a } = harness()
  for (const [choices, ids] of [
    [[0, 1, 2], ['boxes-hattrick']],
    [[6, 7, 8], ['boxes-elves']],
    [[9, 10, 11], ['boxes-miv']],
    [
      [5, 3, 4],
      ['boxes-hattrick', 'boxes-golden'],
    ],
  ]) {
    const wallet = a.freshEconomy()
    a.settleEconomy(wallet, 'Mathias', context, now)
    const before = wallet.balance
    a.applyBoxesPick(wallet, day, choices, a.BOX_PRIZES, now)
    a.settleEconomy(wallet, 'Mathias', context, now)
    assert.equal(wallet.balance, before + wallet.days[day].boxes.amount + 20 * ids.length)
    assert.equal(
      wallet.history.filter((entry) => entry.id.startsWith('badge:boxes-')).length,
      ids.length,
    )
    const badges = a
      .badgesFor('Mathias', [], {}, { now, economy: { mathias: a.publicEconomy(wallet) } })
      .filter((badge) => badge.id.startsWith('boxes-'))
    assert.equal(badges.length, 4)
    for (const badge of badges) {
      assert.equal(badge.earned, ids.includes(badge.id), badge.id)
      assert.equal(badge.worth, 1)
      assert.equal(badge.points, ids.includes(badge.id) ? 1 : 0)
      if (badge.earned) assert.equal(badge.earnedAt, day)
    }
    const paid = wallet.balance
    wallet.days = {} // Old attempts are pruned; earned badges and credits must survive.
    a.settleEconomy(wallet, 'Mathias', context, new Date('2027-11-20T12:00:00Z'))
    assert.equal(wallet.balance, paid)
    assert.deepEqual(Object.keys(a.publicEconomy(wallet).boxesAchievements).sort(), ids.sort())
  }
})

test('existing saved runs migrate without replaying the game and remain earned after their day is removed', () => {
  const { api: a } = harness(),
    wallet = a.freshEconomy()
  a.settleEconomy(wallet, 'Mathias', context, now)
  wallet.days['2026-11-08'] = {
    boxes: {
      choices: [1, 2, 3],
      prizes: [
        { kind: 'nit', amount: 0 },
        { kind: 'nit', amount: 0 },
        { kind: 'nit', amount: 0 },
      ],
      amount: 0,
      nominal: 0,
    },
  }
  a.settleEconomy(wallet, 'Mathias', context, now)
  assert.equal(wallet.boxesAchievements['boxes-miv'], '2026-11-08')
  assert.ok(wallet.claims['badge:boxes-miv'])
  const paid = wallet.balance
  delete wallet.days['2026-11-08']
  a.settleEconomy(wallet, 'Mathias', context, now)
  assert.equal(wallet.balance, paid)
  assert.equal(a.publicEconomy(wallet).boxesAchievements['boxes-miv'], '2026-11-08')
})

test('daily availability closes at New Year midnight instead of waiting until04', async () => {
  const { api: a } = harness()
  a.Date = class extends Date {
    constructor(value = '2026-12-31T12:00:00Z') {
      super(value)
    }
  }
  const response = await a.dailyResponse(a.freshEconomy(), '2026-12-31')
  assert.equal(response.boxesActive, true)
  assert.equal(response.nextResetAt, '2026-12-31T23:00:00.000Z')
})
