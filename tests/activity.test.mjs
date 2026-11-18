import assert from 'node:assert/strict'
import test from 'node:test'
import vm from 'node:vm'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import ts from 'typescript'
import { computed, ref, watch, nextTick } from 'vue'

function load(file, context = {}) {
  const exports = {}
  const source = readFileSync(file, 'utf8').replaceAll('import.meta.client', 'true')
  vm.runInNewContext(
    ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    { exports, require: createRequire(import.meta.url), console, ...context },
  )
  return exports
}
const message = {
  title: 'Nyt svar',
  body: 'Nicole har svaret dig',
  url: '/sticker/one?comment=two',
  tag: 'comment-two',
}
const now = new Date('2026-11-18T12:00:00Z')
const api = () => load('server/utils/activity.ts')

test('activity deduplicates repeated events, retains exact destination and caps history at 100', () => {
  const a = api(),
    user = {}
  a.addActivity(user, message, 'replies', now)
  a.addActivity(user, message, 'replies', now)
  assert.equal(user.activity.length, 1)
  assert.equal(user.activity[0].url, message.url)
  assert.match(user.activity[0].id, /^[a-f0-9]{24}$/)
  const first = user.activity[0].id
  for (let i = 0; i < 120; i++)
    a.addActivity(user, { ...message, tag: `event-${i}` }, 'replies', now)
  assert.equal(user.activity.length, 100)
  assert.equal(
    user.activity.some((i) => i.id === first),
    false,
  )
})

test('read markers are selective, idempotent, private to the account and survive later events', () => {
  const a = api(),
    one = {},
    two = {}
  for (const user of [one, two]) a.addActivity(user, message, 'tags', now)
  const id = one.activity[0].id
  a.markActivityRead(one, [id, 'unknown'], now)
  a.markActivityRead(one, [id], new Date('2026-11-19T00:00:00Z'))
  a.addActivity(one, message, 'tags', now)
  assert.equal(one.activity[0].readAt, now.toISOString())
  assert.equal(two.activity[0].readAt, undefined)
})

test('activity never forwards external or backslash destinations', () => {
  const a = api()
  for (const url of [
    'https://example.com',
    '//example.com',
    '/\\example.com',
    'javascript:alert(1)',
  ]) {
    const user = {}
    a.addActivity(user, { ...message, url }, 'tags', now)
    assert.equal(user.activity[0].url, '/mig')
  }
})

test('personal activity is saved with push muted or no subscriptions, without sending extra push', async () => {
  const user = { name: 'Nicole', devices: {}, notify: { tags: false } },
    saved = [],
    pushes = []
  const context = {
    findUser: async () => ({ key: 'nicole', user }),
    saveActivity: async (...args) => saved.push(args),
    wants: (prefs, type) => prefs?.[type] !== false,
    sendPush: async (...args) => {
      pushes.push(args)
      return []
    },
  }
  const a = load('server/utils/badge-push.ts', context)
  await a.notifyUser('Nicole', message, 'tags')
  await a.notifyUser('Nicole', message, 'replies')
  assert.equal(saved.length, 2)
  assert.equal(pushes.length, 0)
})

test('a muted mention is saved once while push falls back to replies, with no self notification', async () => {
  const saved = [],
    sent = []
  const a = load('server/utils/comment-notify.ts', {
    nameKey: (name) => name.toLowerCase(),
    snippet: (text) => text,
    findUser: async (name) => ({ key: name.toLowerCase(), user: { notify: { tags: false } } }),
    wants: (prefs, type) => prefs?.[type] !== false,
    saveActivity: async (...args) => saved.push(args),
    notifyUser: async (...args) => sent.push(args),
  })
  await a.notifyComment(
    { id: 'one', author: 'Mathias', mentions: ['Nicole', 'Mathias'], text: 'Hej' },
    { id: 'sticker', placedBy: ['Nicole', 'Mathias'] },
    { author: 'Nicole' },
  )
  assert.equal(saved.length, 1)
  assert.equal(saved[0][0], 'nicole')
  assert.equal(saved[0][1][0].type, 'tags')
  assert.equal(sent.length, 1)
  assert.equal(sent[0][2], 'replies')
  assert.equal(sent[0][3], false)
})

function route(file, authenticated = true) {
  const a = api(),
    user = { devices: { device: {} } },
    other = { devices: { device: {} } }
  a.addActivity(user, message, 'tags', now)
  a.addActivity(other, message, 'tags', now)
  const headers = {}
  const handler = load(file, {
    ...a,
    defineEventHandler: (f) => f,
    setHeader: (_, k, v) => {
      headers[k] = v
    },
    createError: (v) => Object.assign(new Error(v.statusMessage), v),
    readToken: () => 'token',
    userForToken: async () => (authenticated ? { key: 'nicole', hash: 'device', user } : undefined),
    readBody: async () => ({ ids: [user.activity[0].id], name: 'Mathias' }),
    updateUser: async (key, change) => {
      assert.equal(key, 'nicole')
      change(user)
      return user
    },
  }).default
  return { handler, user, other, headers }
}

test('activity routes require authentication and return only the current user with no caching', async () => {
  for (const file of ['server/api/me/activity.get.ts', 'server/api/me/activity.post.ts']) {
    await assert.rejects(route(file, false).handler({}), { statusCode: 401 })
    const h = route(file)
    const r = await h.handler({})
    assert.equal(h.headers['Cache-Control'], 'no-store')
    assert.equal(r.items.length, 1)
    if (file.includes('.post.')) {
      assert.ok(h.user.activity[0].readAt)
      assert.equal(h.other.activity[0].readAt, undefined)
    }
  }
})

test('a late inbox response from the previous account cannot leak into the next account', async () => {
  const name = ref('Nicole'),
    store = new Map(),
    requests = []
  let token = 'nicole-token'
  const a = load('app/composables/useActivity.ts', {
    require: () => ({ registerRefresh: () => {} }),
    computed,
    watch,
    useUser: () => ({ name }),
    userToken: () => token,
    useState: (key, init) => {
      if (!store.has(key)) store.set(key, ref(init()))
      return store.get(key)
    },
    $fetch: () => new Promise((resolve) => requests.push(resolve)),
  })
  const client = a.useActivity()
  token = 'mathias-token'
  name.value = 'Mathias'
  await nextTick()
  requests[0]({ items: [{ id: 'private-nicole' }] })
  await nextTick()
  assert.equal(client.items.value.length, 0)
  requests[1]({ items: [{ id: 'mathias' }] })
  await new Promise((resolve) => setImmediate(resolve))
  assert.equal(client.items.value[0].id, 'mathias')
  token = ''
  name.value = null
  await nextTick()
  assert.equal(client.items.value.length, 0)
})
