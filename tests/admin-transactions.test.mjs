import assert from 'node:assert/strict'
import test from 'node:test'
import vm from 'node:vm'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

function route({ wallet, exists = true } = {}) {
  const calls = [],
    headers = {},
    context = {
      exports: {},
      defineEventHandler: (handler) => handler,
      requireAdmin: (event) => {
        if (!event.admin) throw Object.assign(new Error('Admin required'), { statusCode: 401 })
      },
      setHeader: (_, key, value) => {
        headers[key] = value
      },
      getRouterParam: (event) => event.name,
      findUser: async (name) => {
        calls.push(['user', name])
        return exists ? { user: { name: 'Nicole', devices: { secret: 'hidden' } } } : undefined
      },
      readEconomy: async (name) => {
        calls.push(['wallet', name])
        return wallet
      },
      createError: (error) => Object.assign(new Error(error.statusMessage), error),
    }
  vm.runInNewContext(
    ts.transpileModule(readFileSync('server/api/admin/users/[name]/transactions.get.ts', 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    context,
  )
  return { call: context.exports.default, calls, headers }
}

test('transaction history requires admin before reading any user or wallet', async () => {
  const h = route()
  await assert.rejects(h.call({ name: 'Nicole' }), { statusCode: 401 })
  assert.equal(h.calls.length, 0)
})
test('missing users return 404 without looking up another wallet', async () => {
  const h = route({ exists: false })
  await assert.rejects(h.call({ admin: true, name: 'missing' }), { statusCode: 404 })
  assert.equal(h.calls.length, 1)
})
test('admin gets all saved transactions newest first, without private wallet fields or writes', async () => {
  const history = Array.from({ length: 250 }, (_, i) => ({
    id: String(i),
    amount: i % 2 ? 50 : -25,
    label: 'Spil ' + i,
    at: new Date(1700000000000 + i * 1000).toISOString(),
    secret: 'hidden',
  }))
  const wallet = { balance: 1234, history, claims: { secret: true }, days: { secret: true } }
  const before = JSON.stringify(wallet),
    h = route({ wallet })
  const result = await h.call({ admin: true, name: 'nIcOlE' })
  assert.equal(result.name, 'Nicole')
  assert.equal(result.balance, 1234)
  assert.equal(result.history.length, 250)
  assert.equal(result.history[0].id, '249')
  assert.equal(result.history.at(-1).id, '0')
  assert.equal(h.headers['Cache-Control'], 'no-store')
  assert.equal(JSON.stringify(result).includes('secret'), false)
  assert.equal(JSON.stringify(wallet), before)
  assert.deepEqual(h.calls, [
    ['user', 'nIcOlE'],
    ['wallet', 'Nicole'],
  ])
})
test('registered users without a wallet have zero balance and empty history', async () => {
  const h = route()
  const result = await h.call({ admin: true, name: 'Nicole' })
  assert.equal(result.balance, 0)
  assert.equal(result.history.length, 0)
})
