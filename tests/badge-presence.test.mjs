import assert from 'node:assert/strict'
import test from 'node:test'
import vm from 'node:vm'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { ref, watch, nextTick } from 'vue'

function load(path, context) {
  const exports = {}
  const source = readFileSync(path, 'utf8').replaceAll('import.meta.hot', 'false')
  vm.runInNewContext(
    ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    { exports, ...context },
  )
  return exports
}
function setup(remote) {
  let now = Date.parse('2026-11-02T12:00:00Z')
  const data = new Map(),
    sent = []
  const user = {
    name: 'Nicole',
    devices: {
      phone: { push: { endpoint: 'phone' } },
      tablet: { push: { endpoint: 'tablet' } },
    },
  }
  const context = {
    Date: class extends Date {
      static now() {
        return now
      }
    },
    redisEnabled: remote,
    useStorage: () => ({
      getItem: async (k) => structuredClone(data.get(k)),
      setItem: async (k, value) => data.set(k, structuredClone(value)),
    }),
    redis: async (commands) =>
      commands.map(([cmd, key, field, value]) => {
        const hash = data.get(key) ?? {}
        if (cmd === 'HSET') {
          hash[field] = value
          data.set(key, hash)
          return 1
        }
        if (cmd === 'HDEL') {
          delete hash[field]
          return 1
        }
        if (cmd === 'EXPIRE') return 1
        if (cmd === 'HVALS') return Object.values(hash)
        throw Error(cmd)
      }),
    wants: (prefs, type) => prefs?.[type] !== false,
    findUser: async () => ({ key: 'nicole', user }),
    sendPush: async (subs, message) => {
      sent.push({ endpoints: Array.from(subs, (s) => s.endpoint), message })
      return []
    },
    console,
  }
  Object.assign(context, load('server/utils/presence.ts', context))
  const api = { ...context, ...load('server/utils/badge-push.ts', context) }
  return {
    api,
    user,
    sent,
    advance: (ms) => {
      now += ms
    },
  }
}

for (const remote of [false, true]) {
  test(`${remote ? 'Redis' : 'local'}: badges skip the visible device, other push types still reach it`, async () => {
    const h = setup(remote)
    await h.api.setDevicePresence('phone', 'tab-a', true)
    await h.api.notifyUser('Nicole', { title: 'Badge' }, 'badges')
    assert.deepEqual(h.sent[0].endpoints, ['tablet'])
    for (const type of ['levels', 'records', 'comments', 'updates']) {
      await h.api.notifyUser('Nicole', { title: type }, type)
      assert.deepEqual(h.sent.at(-1).endpoints, ['phone', 'tablet'])
    }
    await h.api.setDevicePresence('phone', 'tab-a', false)
    await h.api.notifyUser('Nicole', { title: 'Badge' }, 'badges')
    assert.deepEqual(h.sent.at(-1).endpoints, ['phone', 'tablet'])
  })
  test(`${remote ? 'Redis' : 'local'}: multiple tabs, heartbeat expiry and notification preferences`, async () => {
    const h = setup(remote)
    await Promise.all([
      h.api.setDevicePresence('phone', 'tab-a', true),
      h.api.setDevicePresence('phone', 'tab-b', true),
    ])
    await h.api.setDevicePresence('phone', 'tab-a', false)
    assert.equal((await h.api.visibleDeviceHashes(h.user)).has('phone'), true)
    h.advance(60_000)
    await h.api.setDevicePresence('phone', 'tab-b', true)
    h.advance(20_000)
    assert.equal((await h.api.visibleDeviceHashes(h.user)).has('phone'), true)
    h.advance(75_000)
    assert.equal((await h.api.visibleDeviceHashes(h.user)).size, 0)
    h.user.notify = { badges: false }
    await h.api.notifyUser('Nicole', { title: 'Badge' }, 'badges')
    assert.equal(h.sent.length, 0)
  })
}

test('presence API derives device identity from the token and validates the tab payload', async () => {
  let body = { tab: 'abcdefghijklmnop', visible: true, hash: 'someone-else' }
  const saved = []
  let found = { hash: 'authenticated-device' }
  const handler = load('server/api/me/presence.post.ts', {
    defineEventHandler: (fn) => fn,
    userForToken: async () => found,
    readToken: () => 'token',
    readBody: async () => body,
    createError: (e) => Object.assign(new Error(), e),
    setDevicePresence: async (...args) => saved.push(args),
  }).default
  await handler({})
  assert.deepEqual(saved, [['authenticated-device', 'abcdefghijklmnop', true]])
  body = { tab: 'bad/key', visible: true }
  await assert.rejects(handler({}), { statusCode: 400 })
  found = undefined
  await assert.rejects(handler({}), { statusCode: 401 })
  assert.equal(saved.length, 1)
})

test('client reports visibility and account changes in order, and never heartbeats while hidden', async () => {
  const state = { ready: ref(true), name: ref('Nicole'), badgePush: ref(true) }
  const events = new Map(),
    sent = []
  let heartbeat,
    cleanup,
    token = 'token-nicole'
  const document = {
    visibilityState: 'visible',
    addEventListener: (name, fn) => events.set(name, fn),
    removeEventListener: (name) => events.delete(name),
  }
  const plugin = load('app/plugins/presence.client.ts', {
    defineNuxtPlugin: (fn) => fn,
    useUser: () => state,
    userToken: () => token,
    crypto: { randomUUID: () => 'abcdefghijklmnop' },
    watch,
    document,
    AbortSignal,
    window: document,
    setInterval: (fn) => {
      heartbeat = fn
      return 1
    },
    clearInterval: () => {},
    fetch: async (_url, options) =>
      sent.push({ token: options.headers['x-user-token'], ...JSON.parse(options.body) }),
  }).default
  const flush = async () => {
    await nextTick()
    await new Promise(setImmediate)
  }
  plugin({
    vueApp: {
      onUnmount: (fn) => {
        cleanup = fn
      },
    },
  })
  await flush()
  document.visibilityState = 'hidden'
  events.get('visibilitychange')()
  await flush()
  heartbeat()
  await flush()
  assert.deepEqual(
    sent.map((s) => s.visible),
    [true, false],
  )
  document.visibilityState = 'visible'
  events.get('visibilitychange')()
  await flush()
  token = 'token-mathias'
  state.name.value = 'Mathias'
  await flush()
  assert.deepEqual(
    sent.slice(-2).map((s) => [s.token, s.visible]),
    [
      ['token-nicole', false],
      ['token-mathias', true],
    ],
  )
  cleanup()
  await flush()
  assert.equal(sent.at(-1).visible, false)
  assert.equal(events.size, 0)
})
