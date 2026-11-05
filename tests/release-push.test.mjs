import assert from 'node:assert/strict'
import test from 'node:test'
import vm from 'node:vm'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

function load(path, context) {
  const exports = {}
  vm.runInNewContext(
    ts.transpileModule(readFileSync(path, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    { exports, ...context },
  )
  return exports
}
const sub = (endpoint) => ({ endpoint, keys: { auth: 'auth', p256dh: 'key' } })
function setup({ env = 'production', version = '2.3', date = '2026-01-01', db, now, push } = {}) {
  db ??= { rank: 2002000 }
  const sent = [],
    users = [],
    publicSubs = [],
    prefs = {},
    removed = []
  let reads = 0,
    fail = false
  const context = {
    Date: now
      ? class extends Date {
          constructor() {
            super(now)
          }
        }
      : Date,
    process: { env: { VERCEL_ENV: env } },
    redisEnabled: true,
    require: () => ({ CHANGELOG: [{ version, date, push }] }),
    wants: (p, t) => p?.[t] !== false,
    listUsers: async () => users,
    publicPushPrefs: async () => prefs,
    allSubs: async () => {
      reads++
      if (fail) throw Error('Unavailable')
      return publicSubs
    },
    redisEval: async (_script, keys, [rank]) => {
      assert.deepEqual(Array.from(keys), ['push:release:latest'])
      if (Number(rank) <= db.rank) return 0
      db.rank = Number(rank)
      return 1
    },
    sendPush: async (subs, message) => {
      sent.push({ subs, message })
      return []
    },
    removeSub: async (...args) => removed.push(args),
    console: { error: () => {} },
  }
  Object.assign(context, load('server/utils/badge-push.ts', context))
  const api = load('server/utils/release-push.ts', context)
  return {
    api,
    sent,
    users,
    publicSubs,
    prefs,
    removed,
    reads: () => reads,
    fail: (value) => {
      fail = value
    },
  }
}

test('preview, local, historical, draft and future releases never broadcast', async () => {
  for (const options of [
    { env: 'preview' },
    { env: '' },
    { env: 'development' },
    { version: '2.2' },
    { version: '2.3', date: '' },
    { date: '2099-01-01' },
    { version: 'invalid' },
  ]) {
    const h = setup(options)
    await h.api.announceRelease()
    assert.equal(h.reads(), 0)
    assert.equal(h.sent.length, 0)
  }
})

test('release dates follow Danish midnight rather than UTC midnight', async () => {
  const h = setup({ date: '2026-11-01', now: '2026-10-31T23:30:00Z' })
  await h.api.announceRelease()
  assert.equal(h.sent.length, 1)
})

test('a release can supply its own mobile notification and destination, without sending it twice', async () => {
  const push = {
    title: '🎉 Bananjack er landet!',
    body: 'Casinoet er åbent! Prøv Bananjack, vind bananer og optjen nye badges.',
    url: '/spil/casino',
  }
  const h = setup({ push })
  await h.api.announceRelease()
  await h.api.announceRelease()
  assert.equal(h.sent.length, 1)
  assert.equal(h.sent[0].message.title, push.title)
  assert.equal(h.sent[0].message.body, push.body)
  assert.equal(h.sent[0].message.url, '/spil/casino')
  assert.equal(h.sent[0].message.tag, 'app-release-2.3')
})

test('broadcast deduplicates public and account devices and respects both preference scopes', async () => {
  const h = setup()
  h.publicSubs.push(...['anonymous', 'muted-anonymous', 'member', 'muted-member'].map(sub))
  h.prefs['muted-anonymous'] = { updates: false }
  h.prefs.member = { updates: false } // account preference takes precedence
  h.users.push(
    {
      name: 'Nicole',
      devices: { a: { push: sub('member') }, b: { push: sub('personal-only') }, c: {} },
    },
    { name: 'Mathias', notify: { updates: false }, devices: { a: { push: sub('muted-member') } } },
  )
  await h.api.announceRelease()
  assert.equal(h.sent.length, 1)
  assert.deepEqual(Array.from(h.sent[0].subs, (s) => s.endpoint).sort(), [
    'anonymous',
    'member',
    'personal-only',
  ])
  assert.equal(h.sent[0].message.url, '/nyheder')
  assert.equal(h.sent[0].message.title, '🆕 Ny opdatering · Version 2.3')
  assert.equal(h.sent[0].message.tag, 'app-release-2.3')
})

test('simultaneous cold starts, redeploys and rollbacks cannot rebroadcast a version', async () => {
  const db = { rank: 2002000 }
  const runs = Array.from({ length: 12 }, () => setup({ db }))
  await Promise.all(runs.map((h) => h.api.announceRelease()))
  assert.equal(
    runs.reduce((n, h) => n + h.sent.length, 0),
    1,
  )
  const next = setup({ db, version: '2.4' })
  await next.api.announceRelease()
  assert.equal(next.sent.length, 1)
  const rollback = setup({ db })
  await rollback.api.announceRelease()
  assert.equal(rollback.sent.length, 0)
})

test('a failed recipient lookup does not consume the release claim and can retry', async () => {
  const h = setup()
  h.fail(true)
  await h.api.checkReleasePush()
  assert.equal(h.sent.length, 0)
  h.fail(false)
  await h.api.checkReleasePush()
  assert.equal(h.sent.length, 1)
  await h.api.checkReleasePush()
  assert.equal(h.sent.length, 1)
})

test('anonymous settings only accept public notification types on a subscribed device', async () => {
  const saved = []
  let subscribed = true
  const route = load('server/api/push.put.ts', {
    defineEventHandler: (fn) => fn,
    readBody: async () => ({
      ...sub('device'),
      notify: { updates: false, stickers: true, likes: false },
    }),
    cleanSub: (body) => body,
    hasSub: async () => subscribed,
    setPublicPushPrefs: async (endpoint, prefs) => saved.push({ endpoint, prefs }),
    createError: (e) => Object.assign(new Error(), e),
  }).default
  await route({})
  assert.equal(saved[0].prefs.updates, false)
  assert.equal(saved[0].prefs.stickers, true)
  assert.equal(saved[0].prefs.likes, undefined)
  subscribed = false
  await assert.rejects(route({}), { statusCode: 400 })
  assert.equal(saved.length, 1)
})
