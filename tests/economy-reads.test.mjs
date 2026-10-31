import assert from 'node:assert/strict'
import test from 'node:test'
import vm from 'node:vm'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
function route(path, context) {
  const exports = {}
  const code = ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText
  vm.runInNewContext(code, { exports, defineEventHandler: (handler) => handler, Date, ...context })
  return exports.default
}
test('public balances do not settle wallets or compute badges on read', async () => {
  const handler = route('server/api/economy/public.get.ts', {
    setHeader: () => {},
    syncAllEconomies: () => {
      throw Error('Unexpected write')
    },
    listUsers: async () => [{ name: 'Nicole' }],
    nameKey: (s) => s.toLowerCase(),
    publicEconomies: async () => ({ nicole: { balance: 250 }, unregistered: { balance: 10 } }),
  })
  const response = await handler({})
  assert.equal(response.nicole.balance, 250)
  assert.equal(response.unregistered, undefined)
})
test('resuming Bananjack does not sync badges for the community', async () => {
  const handler = route('server/api/games/bananjack.get.ts', {
    require: () => ({ jackPublic: () => null, jackDailyLimit: () => ({ remaining: 1000 }) }),
    economyUser: async () => ({ user: { name: 'Nicole' } }),
    syncEconomy: async () => ({ balance: 250 }),
    syncBadgesLater: () => {
      throw Error('Unexpected community sync')
    },
  })
  const response = await handler({})
  assert.equal(response.balance, 250)
  assert.equal(response.dailyLimit.remaining, 1000)
})
