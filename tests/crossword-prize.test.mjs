import assert from 'node:assert/strict'
import test from 'node:test'
import vm from 'node:vm'
import { readFileSync, existsSync } from 'node:fs'
import ts from 'typescript'
import { setup } from './helpers/economy-harness.mjs'

function route(api) {
  const exports = {}
  api.defineEventHandler = (f) => f
  api.requireAdmin = (event) => {
    if (!event.admin) throw Object.assign(new Error('Admin required'), { statusCode: 401 })
  }
  api.readBody = async (event) => event.body
  api.setHeader = () => {}
  const code = ts.transpileModule(
    readFileSync('server/api/admin/crossword/delivery.post.ts', 'utf8'),
    { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } },
  ).outputText
  vm.runInContext(`(function(exports){${code}\n})`, api)(exports)
  return exports.default
}

test('crossword has one non-seasonal RTA mug prize alongside its existing 1000 bananas', () => {
  const { api: a } = setup(false, ['server/utils/crossword.ts'])
  assert.equal(a.CROSSWORD_PRIZE, 1000)
  assert.equal(a.CROSSWORD_PHYSICAL_PRIZE.kind, 'rta-mug')
  assert.ok(existsSync('public' + a.CROSSWORD_PHYSICAL_PRIZE.image))
  assert.ok(!a.CROSSWORD_PHYSICAL_PRIZE.image.includes('christmas'))
})

for (const remote of [false, true])
  test(`only admin can deliver the committed winner's single mug; retries are idempotent (${remote ? 'Redis' : 'local'})`, async () => {
    const { api: a } = setup(remote, ['server/utils/crossword.ts'])
    const post = route(a)
    await assert.rejects(post({ body: { delivered: true } }), { statusCode: 401 })
    await assert.rejects(post({ admin: true, body: { delivered: 'yes' } }), { statusCode: 400 })
    await assert.rejects(post({ admin: true, body: { delivered: true } }), { statusCode: 409 })
    await a.mutateCrossword((state) => {
      state.winner = { name: 'Nicole', at: '2026-11-20T12:00:00Z' }
      state.finished = {
        'u:nicole': state.winner,
        'u:mathias': { name: 'Mathias', at: '2026-11-20T12:01:00Z' },
      }
    })
    const result = await post({ admin: true, body: { delivered: true, winner: 'Mathias' } })
    assert.ok(result.deliveredAt)
    const repeated = await post({ admin: true, body: { delivered: true } })
    assert.equal(repeated.deliveredAt, result.deliveredAt)
    const state = await a.readCrossword()
    assert.equal(state.winner.name, 'Nicole')
    assert.equal(a.crosswordView(state, 'Mathias').completed, true)
    assert.equal(a.crosswordView(state, 'Mathias').prizeDeliveredAt, undefined)
    assert.equal(await a.readEconomy('Mathias'), undefined)
    await a.settleCrosswordWinner(state)
    await a.settleCrosswordWinner(await a.readCrossword())
    assert.equal((await a.readEconomy('Nicole')).balance, 1000)
    assert.equal((await a.readCrossword()).prizeDeliveredAt, result.deliveredAt)
    const undone = await post({ admin: true, body: { delivered: false } })
    assert.equal(undone.deliveredAt, null)
    assert.equal((await a.readCrossword()).winner.name, 'Nicole')
  })
