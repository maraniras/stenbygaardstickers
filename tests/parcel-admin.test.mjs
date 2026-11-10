import assert from 'node:assert/strict'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'
import { readFileSync } from 'node:fs'
import { setup } from './helpers/economy-harness.mjs'

const openedAt = '2026-12-28T12:00:00.000Z'
function fixture(redis = false) {
  const h = setup(redis, ['server/utils/parcel-game.ts', 'server/utils/parcel-admin.ts'])
  const game = {
    year: 2026,
    startsAt: '2026-11-27T03:00:00Z',
    endsAt: openedAt,
    ended: true,
    prizesAssigned: true,
    players: ['Nicole', 'Norsk'],
    turns: {},
    pending: {},
    events: [],
    parcels: [
      {
        id: 'p1',
        style: 0,
        owner: 'Nicole',
        amount: 50,
        openedAt,
        reward: { kind: 'mix-max', title: 'Mix Max', amount: 50 },
      },
      {
        id: 'p2',
        style: 1,
        owner: 'Nicole',
        amount: 50,
        openedAt,
        reward: { kind: 'faxe-kondi', title: 'Faxe Kondi', amount: 50 },
      },
      {
        id: 'p3',
        style: 2,
        owner: 'Norsk',
        amount: 50,
        reward: { kind: 'cake', title: 'Træstammer', amount: 50 },
      },
      {
        id: 'p4',
        style: 3,
        owner: null,
        amount: 50,
        reward: { kind: 'bottle', title: 'Drikkedunk', amount: 50 },
      },
      {
        id: 'p5',
        style: 4,
        owner: 'Nicole',
        amount: 0,
        reward: { kind: 'frame', title: 'Ramme', amount: 0 },
      },
    ],
  }
  const wallet = h.api.freshEconomy()
  wallet.balance = 1234
  wallet.parcelRewards = Object.fromEntries(
    game.parcels
      .slice(0, 2)
      .map((p) => [
        `parcel-open:2026:${p.id}`,
        { year: 2026, parcelId: p.id, reward: p.reward, openedAt },
      ]),
  )
  return { ...h, game, wallet }
}

test('admin reads only physical prizes after the end, preserves duplicate winners and never changes the game', () => {
  const { api: a, game, wallet } = fixture()
  const original = JSON.stringify({ game, wallet })
  const rows = a.parcelPhysicalWinners(game, { nicole: wallet })
  assert.equal(rows.length, 4)
  assert.equal(rows.filter((p) => p.winner === 'Nicole').length, 2)
  assert.equal(rows.filter((p) => p.openedAt).length, 2)
  assert.equal(rows.find((p) => p.parcelId === 'p3').openedAt, null)
  assert.equal(rows.find((p) => p.parcelId === 'p4').winner, null)
  assert.equal(JSON.stringify({ game, wallet }), original)
  const dto = a.parcelAdminCampaigns({ 2026: game }, { nicole: wallet })[0]
  assert.equal(dto.phase, 'ended')
  assert.equal(dto.endsAt, undefined)
  assert.equal(dto.turns, undefined)
  game.ended = false
  assert.equal(a.parcelPhysicalWinners(game, { nicole: wallet }).length, 0)
  game.ended = true
  game.cancelled = true
  assert.equal(a.parcelPhysicalWinners(game, { nicole: wallet }).length, 0)
})

for (const redis of [false, true])
  test(`delivery timestamps are idempotent, independent and reversible without wallet effects (${redis ? 'Redis' : 'local'})`, async () => {
    const { api: a, game, wallet } = fixture(redis)
    await a.mutateEconomy('Nicole', (w) => Object.assign(w, wallet))
    const at = new Date('2026-12-29T10:00:00Z')
    await Promise.all(
      ['2026:p1', '2026:p2', '2026:p1'].map((id) =>
        a.mutateEconomy('Nicole', (w) => a.setParcelPrizeDelivery(w, game, id, true, at)),
      ),
    )
    await a.mutateEconomy('Nicole', (w) =>
      a.setParcelPrizeDelivery(w, game, '2026:p1', true, new Date('2026-12-30')),
    )
    let saved = await a.readEconomy('Nicole')
    assert.equal(saved.parcelRewards['parcel-open:2026:p1'].deliveredAt, at.toISOString())
    assert.equal(
      a.parcelPhysicalWinners(game, { nicole: saved }).filter((p) => p.deliveredAt).length,
      2,
    )
    await a.mutateEconomy('Nicole', (w) => a.setParcelPrizeDelivery(w, game, '2026:p1', false))
    saved = await a.readEconomy('Nicole')
    assert.equal(
      a.parcelPhysicalWinners(game, { nicole: saved }).filter((p) => p.deliveredAt).length,
      1,
    )
    assert.equal(saved.balance, 1234)
    assert.equal(saved.history.length, 0)
    assert.equal(Object.keys(saved.claims).length, 0)
    assert.throws(() => a.setParcelPrizeDelivery(saved, game, '2026:p3', true), { statusCode: 409 })
    assert.throws(() => a.setParcelPrizeDelivery(saved, game, '2026:p4', true), { statusCode: 404 })
    assert.throws(() => a.setParcelPrizeDelivery(saved, game, '2026:p5', true), { statusCode: 404 })
    game.ended = false
    assert.throws(() => a.setParcelPrizeDelivery(saved, game, '2026:p1', true), { statusCode: 409 })
  })

function endpoint(file, globals) {
  const exports = {}
  vm.runInNewContext(
    ts.transpileModule(readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText,
    { exports, defineEventHandler: (fn) => fn, ...globals },
  )
  return exports.default
}
test('admin endpoints authenticate first and derive recipient from the stored game', async () => {
  const { api: a, game, wallet } = fixture()
  let allowed = false,
    reads = 0,
    writes = 0,
    owner
  let body = { id: '2026:p1', delivered: true, winner: 'Norsk' }
  const headers = {}
  const globals = {
    ...a,
    requireAdmin() {
      if (!allowed) throw Object.assign(Error('Admin'), { statusCode: 401 })
    },
    setHeader(_event, key, value) {
      headers[key] = value
    },
    readBody: async () => {
      reads++
      return body
    },
    parcelBackup: async () => {
      reads++
      return { 2026: game }
    },
    allEconomyRecords: async () => {
      reads++
      return { nicole: wallet }
    },
    mutateEconomy: async (name, fn) => {
      writes++
      owner = name
      fn(wallet)
      return { record: wallet }
    },
  }
  const get = endpoint('server/api/admin/parcels.get.ts', globals)
  const post = endpoint('server/api/admin/parcels/delivery.post.ts', globals)
  await assert.rejects(() => get({}), { statusCode: 401 })
  await assert.rejects(() => post({}), { statusCode: 401 })
  assert.equal(reads, 0)
  allowed = true
  assert.equal((await get({})).campaigns[0].physicalWinners.length, 4)
  assert.equal(headers['Cache-Control'], 'no-store')
  body = { id: '2026:p1', delivered: 'yes' }
  await assert.rejects(() => post({}), { statusCode: 400 })
  assert.equal(writes, 0)
  body = { id: '2026:p1', delivered: true, winner: 'Norsk' }
  const result = await post({})
  assert.equal(owner, 'Nicole')
  assert.ok(result.deliveredAt)
  assert.equal(writes, 1)
})
