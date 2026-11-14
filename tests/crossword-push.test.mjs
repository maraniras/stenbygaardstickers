import assert from 'node:assert/strict'
import test from 'node:test'
import vm from 'node:vm'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import ts from 'typescript'

const opening = '2026-12-01T19:00:00.000Z'
const hour = 3600000
const time = Date.parse(opening)
const sub = (endpoint) => ({ endpoint, keys: { auth: 'fixture', p256dh: 'fixture' } })
function setup({ env = 'production', token = 'fixture-token' } = {}) {
  const state = { opensAt: opening, winner: null, finished: {}, attempts: {} }
  const jobs = [],
    pushes = [],
    users = [],
    publicSubs = [],
    prefs = {},
    removed = []
  let failQueue = false,
    failLookup = false,
    duringLookup
  const load = (path, context) => {
    const exports = {}
    vm.runInNewContext(
      ts.transpileModule(readFileSync(path, 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
      }).outputText,
      { exports, ...context },
    )
    return exports
  }
  const context = {
    process: { env: { VERCEL_ENV: env, QSTASH_TOKEN: token } },
    require: createRequire(import.meta.url),
    Buffer,
    Date,
    Map,
    Set,
    Promise,
    console: { error() {} },
    redisEnabled: true,
    createError: (data) => Object.assign(Error(data.statusMessage), data),
    nameKey: (name) => name.toLocaleLowerCase('da'),
    wants: (settings, kind) => settings?.[kind] !== false,
    listUsers: async () => users,
    publicPushPrefs: async () => prefs,
    allSubs: async () => {
      if (failLookup) throw Error('lookup unavailable')
      duringLookup?.()
      return publicSubs
    },
    readCrossword: async () => structuredClone(state),
    mutateCrossword: async (fn) => ({ result: fn(state), state }),
    $fetch: async (url, options) => {
      if (failQueue) throw Error('queue unavailable')
      jobs.push({ url, ...options })
      return { messageId: 'fixture' }
    },
    sendPush: async (subs, message) => {
      pushes.push({ subs, message })
      return []
    },
    removeSub: async (...args) => removed.push(args),
    updateUser: async (key, change) => change(users.find((u) => u.name.toLowerCase() === key)),
  }
  Object.assign(context, load('server/utils/badge-push.ts', context))
  const api = load('server/utils/crossword-push.ts', context)
  return {
    api,
    state,
    jobs,
    pushes,
    users,
    publicSubs,
    prefs,
    failQueue: (value) => {
      failQueue = value
    },
    failLookup: (value) => {
      failLookup = value
    },
    duringLookup: (fn) => {
      duringLookup = fn
    },
  }
}

test('two server-side jobs target exactly one hour before opening and the opening instant', async () => {
  const h = setup()
  assert.equal(await h.api.scheduleCrosswordPushes(h.state, new Date(time - 2 * hour)), 'scheduled')
  assert.deepEqual(
    h.jobs.map((j) => Number(j.headers['Upstash-Not-Before'])),
    [(time - hour) / 1000, time / 1000],
  )
  assert.deepEqual(
    h.jobs.map((j) => j.body.kind),
    ['reminder', 'opened'],
  )
  assert.equal(h.api.crosswordPushStatus(h.state), 'scheduled')
  for (const job of h.jobs) {
    assert.ok(
      job.url.startsWith(
        'https://qstash.upstash.io/v2/publish/https://stenbygaardstickers.vercel.app/',
      ),
    )
    assert.equal(h.api.crosswordPushAuthorized(job.headers['Upstash-Forward-Authorization']), true)
    assert.ok(!job.headers['Upstash-Forward-Authorization'].includes('fixture-token'))
    assert.deepEqual(Object.keys(job.body).sort(), ['kind', 'opensAt'])
  }
  assert.equal(h.api.crosswordPushAuthorized('Bearer invalid'), false)
  assert.equal(h.api.crosswordPushAuthorized(undefined), false)
})

test('Hobby-compatible relays keep every delay under seven days without sending early', async () => {
  const h = setup()
  const early = new Date(time - 40 * 24 * hour)
  await h.api.scheduleCrosswordPushes(h.state, early)
  for (const job of h.jobs) {
    const scheduled = Number(job.headers['Upstash-Not-Before']) * 1000
    assert.ok(scheduled > early.getTime() && scheduled <= early.getTime() + 6 * 24 * hour)
  }
  const count = h.jobs.length
  const result = await h.api.deliverCrosswordPush(h.jobs[0].body, early)
  assert.equal(result.relayed, true)
  assert.equal(h.jobs.length, count + 1)
  assert.equal(h.pushes.length, 0)
  assert.equal(h.state.pushSent, undefined)
})

test('local/preview environments, missing credentials and unscheduled games never publish', async () => {
  for (const options of [{ env: '' }, { env: 'preview' }, { token: '' }]) {
    const h = setup(options)
    await h.api.scheduleCrosswordPushes(h.state, new Date(time - 2 * hour))
    await h.api.deliverCrosswordPush({ opensAt: opening, kind: 'opened' }, new Date(time))
    assert.equal(h.jobs.length, 0)
    assert.equal(h.pushes.length, 0)
    assert.equal(h.api.crosswordPushAuthorized('anything'), false)
  }
  const h = setup()
  h.state.opensAt = null
  assert.equal(await h.api.scheduleCrosswordPushes(h.state), 'unscheduled')
  assert.equal(h.jobs.length, 0)
})

test('each stage broadcasts once under concurrent callbacks, with separate destinations', async () => {
  const h = setup()
  h.publicSubs.push(sub('anonymous'))
  for (const [kind, now] of [
    ['reminder', time - hour],
    ['opened', time],
  ]) {
    await Promise.all(
      Array.from({ length: 12 }, () =>
        h.api.deliverCrosswordPush({ opensAt: opening, kind }, new Date(now)),
      ),
    )
  }
  assert.equal(h.pushes.length, 2)
  assert.equal(h.pushes[0].message.url, '/spil/oevrige')
  assert.equal(h.pushes[1].message.url, '/spil/krydsord')
  assert.notEqual(h.pushes[0].message.tag, h.pushes[1].message.tag)
})

test('preferences apply to guests and accounts, with subscription deduplication', async () => {
  const h = setup()
  h.publicSubs.push(...['guest', 'muted-guest', 'member', 'muted-member'].map(sub))
  h.prefs['muted-guest'] = { crossword: false }
  h.prefs.member = { crossword: false } // Account settings take precedence.
  h.users.push(
    { name: 'Nicole', devices: { a: { push: sub('member') }, b: { push: sub('only-account') } } },
    {
      name: 'Mathias',
      notify: { crossword: false },
      devices: { a: { push: sub('muted-member') } },
    },
  )
  await h.api.deliverCrosswordPush({ opensAt: opening, kind: 'opened' }, new Date(time))
  assert.deepEqual(Array.from(h.pushes[0].subs, (s) => s.endpoint).sort(), [
    'guest',
    'member',
    'only-account',
  ])
})

test('rescheduling, cancelling and expired reminders cannot send stale notifications', async () => {
  const h = setup()
  const job = { opensAt: opening, kind: 'reminder' }
  await h.api.deliverCrosswordPush(job, new Date(time))
  h.state.opensAt = null
  await h.api.deliverCrosswordPush(job, new Date(time - hour))
  h.state.opensAt = opening
  h.duringLookup(() => {
    h.state.opensAt = new Date(time + 5 * hour).toISOString()
  })
  await h.api.deliverCrosswordPush(job, new Date(time - hour))
  assert.equal(h.pushes.length, 0)
})

test('failed lookups can retry; queue failures remain visible; short notice skips the reminder', async () => {
  const h = setup()
  h.failLookup(true)
  await assert.rejects(
    h.api.deliverCrosswordPush({ opensAt: opening, kind: 'opened' }, new Date(time)),
  )
  assert.equal(h.state.pushSent, undefined)
  h.failLookup(false)
  await h.api.deliverCrosswordPush({ opensAt: opening, kind: 'opened' }, new Date(time))
  assert.equal(h.pushes.length, 1)
  const short = setup()
  await short.api.scheduleCrosswordPushes(short.state, new Date(time - 30 * 60000))
  assert.deepEqual(
    short.jobs.map((j) => j.body.kind),
    ['opened'],
  )
  const unavailable = setup()
  unavailable.failQueue(true)
  assert.equal(
    await unavailable.api.scheduleCrosswordPushes(unavailable.state, new Date(time - 2 * hour)),
    'failed',
  )
  assert.equal(unavailable.api.crosswordPushStatus(unavailable.state), 'failed')
})

test('callback route requires authorization before reading or delivering the job', async () => {
  let reads = 0,
    delivered = 0
  const context = {
    exports: {},
    defineEventHandler: (fn) => fn,
    setHeader() {},
    getHeader: () => 'bad',
    crosswordPushAuthorized: () => false,
    createError: (data) => Object.assign(Error(), data),
    readBody: async () => {
      reads++
      return {}
    },
    deliverCrosswordPush: async () => {
      delivered++
    },
  }
  vm.runInNewContext(
    ts.transpileModule(readFileSync('server/api/cron/crossword.post.ts', 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText,
    context,
  )
  await assert.rejects(context.exports.default({}), (e) => e.statusCode === 401)
  assert.equal(reads, 0)
  assert.equal(delivered, 0)
})

test('invalid callbacks and excessively late opening messages never create jobs or pushes', async () => {
  const h = setup()
  for (const body of [
    null,
    {},
    { opensAt: 'invalid', kind: 'opened' },
    { opensAt: opening, kind: 'anything' },
  ])
    await assert.rejects(
      h.api.deliverCrosswordPush(body, new Date(time)),
      (e) => e.statusCode === 400,
    )
  await h.api.deliverCrosswordPush({ opensAt: opening, kind: 'opened' }, new Date(time + hour + 1))
  assert.equal(h.pushes.length, 0)
  assert.equal(h.jobs.length, 0)
  assert.equal(h.state.pushSent, undefined)
})
