import test from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
const require = createRequire(import.meta.url)
function setup(env = 'production') {
  const saved = new Map(),
    jobs = [],
    pushes = [],
    names = []
  const context = {
    exports: {},
    require,
    Buffer,
    console,
    process: { env: { VERCEL_ENV: env, QSTASH_TOKEN: 'fixture' } },
    redisEnabled: true,
    redis: async (commands) =>
      commands.map(([cmd, , key, value]) => {
        if (cmd === 'HGET') return saved.get(key)
        if (cmd === 'HSETNX' && saved.has(key)) return 0
        saved.set(key, value)
        return 1
      }),
    $fetch: async (url, options) => {
      jobs.push({ url, ...options })
      return {}
    },
    findUser: async (name) => {
      names.push(name)
      return {
        key: 'mathias',
        user: {
          devices: {
            a: { push: { endpoint: 'test-device' } },
            b: { push: { endpoint: 'test-device' } },
          },
        },
      }
    },
    sendPush: async (subs, message) => {
      pushes.push({ subs, message })
    },
  }
  vm.runInNewContext(
    ts.transpileModule(readFileSync('server/utils/one-off-push.ts', 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    context,
  )
  return { api: context.exports, jobs, pushes, names }
}
const at = new Date('2026-11-20T10:30:00Z')
const body = { id: 'mathias-2026-11-20-1130' }
test('requested test queues once for 11:30 Copenhagen, never locally or after the time', async () => {
  const h = setup()
  await Promise.all([
    h.api.scheduleOneOffPush(new Date(at - 60000)),
    h.api.scheduleOneOffPush(new Date(at - 60000)),
  ])
  await h.api.scheduleOneOffPush(new Date(at - 60000))
  assert.equal(h.jobs.length, 1)
  assert.equal(h.jobs[0].headers['Upstash-Not-Before'], String(at.getTime() / 1000))
  for (const env of ['preview', '']) {
    const local = setup(env)
    await local.api.scheduleOneOffPush(new Date(at - 60000))
    assert.equal(local.jobs.length, 0)
  }
  const late = setup()
  await late.api.scheduleOneOffPush(at)
  assert.equal(late.jobs.length, 0)
})
test('only the fixed Mathias test can send, once, inside its five-minute window', async () => {
  const h = setup()
  assert.equal(h.api.oneOffPushAuthorized('Bearer wrong'), false)
  await h.api.deliverOneOffPush(body, new Date(at - 1))
  await h.api.deliverOneOffPush({ id: 'someone-else' }, at)
  await h.api.deliverOneOffPush(body, new Date(at.getTime() + 300001))
  assert.equal(h.names.length, 0)
  await h.api.deliverOneOffPush(body, at)
  await h.api.deliverOneOffPush(body, at)
  assert.deepEqual(h.names, ['Mathias', 'Mathias'])
  assert.equal(h.pushes.length, 1)
  assert.equal(h.pushes[0].subs.length, 1)
  assert.equal(h.pushes[0].message.url, '/mig')
})
