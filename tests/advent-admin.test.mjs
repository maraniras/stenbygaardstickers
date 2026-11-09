import assert from 'node:assert/strict'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'
import { readFileSync } from 'node:fs'
import { setup } from './helpers/economy-harness.mjs'

function fixture(redis = false) {
  const { api } = setup(redis, ['server/utils/advent-draw.ts', 'server/utils/advent-admin.ts'])
  api.structuredClone = structuredClone
  const draw = api.createAdventDraw(
    [{ name: 'Norsk', createdAt: '2026-11-01T00:00:00Z' }],
    'admin-test',
    new Date('2026-12-01T03:00:00Z'),
  )
  return { api, draw }
}

test('admin physical overview preserves all nine prizes, including repeat winners and bundled finds', () => {
  const { api, draw } = fixture()
  // Put several prizes into the same opening, including a physical extra.
  for (const award of draw.awards) award.day = 24
  const physical = draw.awards.filter((a) => draw.catalog[a.reward].kind === 'physical')
  const opening = {
    day: 24,
    openedAt: '2026-12-24T03:01:00Z',
    amount: 0,
    prize: draw.catalog['banana-single'],
    extras: physical.map((award) => draw.catalog[award.reward]),
  }
  const wallets = { norsk: { advent: { 2026: { 24: opening } } } }
  const before = JSON.stringify({ draw, wallets })
  const entries = api.adventPhysicalWinners(draw, wallets)
  assert.equal(entries.length, 9)
  assert.equal(new Set(entries.map((entry) => entry.id)).size, 9)
  assert.ok(entries.every((entry) => entry.winner === 'Norsk' && entry.day === 24))
  assert.ok(entries.every((entry) => entry.openedAt === opening.openedAt))
  assert.equal(entries.filter((entry) => entry.prize.reward === 'mix-max').length, 5)
  assert.equal(entries.filter((entry) => entry.prize.reward === 'cycling-bottle').length, 2)
  assert.equal(JSON.stringify({ draw, wallets }), before)
})

for (const redis of [false, true])
  test(`individual prize deliveries survive concurrent edits and can be corrected (${redis ? 'Redis' : 'local'})`, async () => {
    const { api: a, draw } = fixture(redis)
    for (const award of draw.awards) award.day = 24
    const physical = a.adventPhysicalWinners(draw, {})
    await a.mutateEconomy('Norsk', (wallet) => {
      wallet.advent = {
        2026: {
          24: {
            day: 24,
            openedAt: '2026-12-24T03:00:00Z',
            amount: 0,
            prize: draw.catalog['banana-single'],
            extras: physical.map((row) => row.prize),
            fulfilment: 'pending',
          },
        },
      }
    })
    const before = await a.readEconomy('Norsk')
    const stamp = new Date('2026-12-24T10:00:00Z')
    await Promise.all(
      physical
        .slice(0, 2)
        .map((row) =>
          a.mutateEconomy('Norsk', (wallet) =>
            a.setAdventPrizeDelivery(wallet, draw, row.id, true, stamp),
          ),
        ),
    )
    let wallet = await a.readEconomy('Norsk')
    assert.equal(Object.keys(wallet.advent[2026][24].deliveries).length, 2)
    assert.equal(wallet.advent[2026][24].fulfilment, 'pending')
    await a.mutateEconomy('Norsk', (wallet) =>
      a.setAdventPrizeDelivery(wallet, draw, physical[0].id, true, new Date('2026-12-25')),
    )
    wallet = await a.readEconomy('Norsk')
    assert.equal(wallet.advent[2026][24].deliveries[physical[0].id], stamp.toISOString())
    await Promise.all(
      physical
        .slice(2)
        .map((row) =>
          a.mutateEconomy('Norsk', (wallet) =>
            a.setAdventPrizeDelivery(wallet, draw, row.id, true, stamp),
          ),
        ),
    )
    wallet = await a.readEconomy('Norsk')
    assert.equal(wallet.advent[2026][24].fulfilment, 'delivered')
    await a.mutateEconomy('Norsk', (wallet) =>
      a.setAdventPrizeDelivery(wallet, draw, physical[0].id, false, stamp),
    )
    wallet = await a.readEconomy('Norsk')
    const rows = a.adventPhysicalWinners(draw, { norsk: wallet })
    assert.equal(rows.filter((row) => row.deliveredAt).length, 8)
    assert.equal(wallet.advent[2026][24].fulfilment, 'pending')
    assert.equal(wallet.balance, before.balance)
    assert.equal(JSON.stringify(wallet.history), JSON.stringify(before.history))
    assert.throws(() => a.setAdventPrizeDelivery(wallet, draw, '2026:999', true), {
      statusCode: 404,
    })
    assert.throws(() => a.setAdventPrizeDelivery({ advent: {} }, draw, physical[0].id, true), {
      statusCode: 409,
    })
  })

test('delivery endpoint authenticates first, validates input and derives the winner from the private draw', async () => {
  const { api, draw } = fixture()
  const prize = api.adventPhysicalWinners(draw, {})[0]
  const wallet = {
    advent: {
      2026: {
        [prize.day]: { day: prize.day, openedAt: '2026-12-24T03:00:00Z', prize: prize.prize },
      },
    },
  }
  let allowed = false,
    body = { id: prize.id, delivered: true, winner: 'Mathias' },
    reads = 0,
    owner,
    writes = 0
  const exports = {}
  vm.runInNewContext(
    ts.transpileModule(readFileSync('server/api/admin/advent/delivery.post.ts', 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText,
    {
      exports,
      ...api,
      defineEventHandler: (fn) => fn,
      requireAdmin() {
        if (!allowed) throw Object.assign(Error('Admin'), { statusCode: 401 })
      },
      setHeader() {},
      readBody: async () => {
        reads++
        return body
      },
      readAdventDraw: async () => draw,
      mutateEconomy: async (name, fn) => {
        owner = name
        fn(wallet)
        writes++
        return { record: wallet }
      },
    },
  )
  await assert.rejects(() => exports.default({}), { statusCode: 401 })
  assert.equal(reads, 0)
  allowed = true
  body.delivered = 'yes'
  await assert.rejects(() => exports.default({}), { statusCode: 400 })
  assert.equal(writes, 0)
  body.delivered = true
  const result = await exports.default({})
  assert.equal(owner, 'Norsk')
  assert.ok(result.deliveredAt)
  assert.equal(writes, 1)
})

test('admin distinguishes assigned prizes from found prizes and never invents winners before the draw', () => {
  const { api, draw } = fixture()
  assert.equal(api.adventPhysicalWinners(undefined, {}).length, 0)
  const unopened = api.adventPhysicalWinners(draw, {})
  assert.equal(unopened.length, 9)
  assert.ok(unopened.every((entry) => entry.openedAt === null))
  const wallets = {
    norsk: {
      advent: {
        2026: Object.fromEntries(
          Array.from({ length: 24 }, (_, i) => [
            i + 1,
            {
              prize: draw.catalog['banana-single'],
              openedAt: '2026-12-24T03:00:00Z',
            },
          ]),
        ),
      },
    },
  }
  assert.ok(api.adventPhysicalWinners(draw, wallets).every((entry) => entry.openedAt === null))
})

test('admin API authenticates before reading wallets or the draw, is uncached and omits private plans/seed', async () => {
  const { api, draw } = fixture()
  let allowed = false,
    reads = 0
  const headers = {}
  const exports = {}
  vm.runInNewContext(
    ts.transpileModule(readFileSync('server/api/admin/advent.get.ts', 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText,
    {
      exports,
      require: () => api,
      ...api,
      defineEventHandler: (fn) => fn,
      requireAdmin() {
        if (!allowed) throw Object.assign(Error('Admin required'), { statusCode: 401 })
      },
      setHeader: (_event, key, value) => {
        headers[key] = value
      },
      allEconomyRecords: async () => {
        reads++
        return {}
      },
      readAdventDraw: async () => {
        reads++
        return draw
      },
    },
  )
  await assert.rejects(() => exports.default({}), { statusCode: 401 })
  assert.equal(reads, 0)
  allowed = true
  const response = await exports.default({})
  assert.equal(response.physicalWinners.length, 9)
  assert.equal(headers['Cache-Control'], 'no-store')
  assert.equal(response.draw.seed, undefined)
  assert.equal(response.draw.plans, undefined)
  assert.equal(reads, 2)
})
