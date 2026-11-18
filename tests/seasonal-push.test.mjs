import assert from 'node:assert/strict'
import test from 'node:test'
import vm from 'node:vm'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import ts from 'typescript'

const hour = 3600_000
const before = new Date('2026-11-18T10:00:00Z')
const sub = (endpoint) => ({ endpoint, keys: { auth: 'fixture', p256dh: 'fixture' } })
function setup({ env = 'production', token = 'fixture-token' } = {}) {
  const saved = new Map(),
    users = [],
    wallets = {},
    jobs = [],
    pushes = [],
    activities = [],
    removed = [],
    boards = {}
  let dead = [],
    queueFailed = false
  const nativeRequire = createRequire(import.meta.url)
  function load(path, additions = {}) {
    const exports = {}
    vm.runInNewContext(
      ts.transpileModule(readFileSync(path, 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
      }).outputText,
      { ...context, ...additions, exports },
    )
    return exports
  }
  const context = {
    process: { env: { VERCEL_ENV: env, QSTASH_TOKEN: token } },
    Buffer,
    Date,
    Map,
    Set,
    Promise,
    console: { error() {} },
    redisEnabled: true,
    require: (id) =>
      id === '../data/seasonal-push' ? load('server/data/seasonal-push.ts') : nativeRequire(id),
    createError: (value) => Object.assign(Error(value.statusMessage), value),
    nameKey: (name) => name.toLocaleLowerCase('da'),
    wants: (prefs, type) => prefs?.[type] !== false,
    listUsers: async () => users,
    allEconomyRecords: async () => wallets,
    parcelBackup: async () => boards,
    redis: async (commands) =>
      commands.map(([cmd, , key, value]) => {
        if (cmd === 'HGETALL') return [...saved.entries()].flat()
        if (cmd === 'HSETNX' && saved.has(key)) return 0
        if (cmd === 'HSET' || cmd === 'HSETNX') {
          saved.set(key, value)
          return 1
        }
        throw Error(cmd)
      }),
    $fetch: async (url, options) => {
      if (queueFailed) throw Error('queue unavailable')
      jobs.push({ url, ...options })
      return { messageId: 'fixture' }
    },
    saveActivity: async (name, messages) => activities.push({ name, messages }),
    sendPush: async (subs, message) => {
      pushes.push({ subs, message })
      return dead
    },
    removeSub: async (...args) => removed.push(args),
    updateUser: async (key, fn) =>
      fn(users.find((user) => user.name.toLocaleLowerCase('da') === key)),
  }
  const api = load('server/utils/seasonal-push.ts')
  const config = load('server/data/seasonal-push.ts').SEASONAL_PUSH_JOBS
  return {
    api,
    config,
    saved,
    users,
    wallets,
    jobs,
    pushes,
    activities,
    removed,
    boards,
    load,
    dead: (value) => {
      dead = value
    },
    failQueue: (value) => {
      queueFailed = value
    },
    user: (name, endpoints = [name], notify = {}) => {
      const user = {
        name,
        notify,
        devices: Object.fromEntries(endpoints.map((endpoint, i) => [i, { push: sub(endpoint) }])),
      }
      users.push(user)
      return user
    },
  }
}

test('five approved dates use Danish winter time, split headings and relevant destinations', async () => {
  const h = setup()
  assert.deepEqual(
    Array.from(h.config, (job) => job.at),
    [
      '2026-11-20T05:30:00.000Z',
      '2026-11-21T07:00:00.000Z',
      '2026-11-26T07:00:00.000Z',
      '2026-11-27T05:30:00.000Z',
      '2026-12-01T05:30:00.000Z',
    ],
  )
  assert.deepEqual(
    Array.from(h.config, (job) => job.url),
    ['/spil/jul', '/spil/pakkeleg', '/spil/pakkeleg', '/spil/pakkeleg', '/spil/julekalender'],
  )
  assert.ok(h.config.every((job) => job.title && job.body && !job.title.includes(' - ')))
  await h.api.scheduleSeasonalPushes(before)
  assert.equal(h.jobs.length, 5)
  await h.api.scheduleSeasonalPushes(before)
  assert.equal(h.jobs.length, 5)
  for (const job of h.jobs) {
    assert.equal(h.api.seasonalPushAuthorized(job.headers['Upstash-Forward-Authorization']), true)
    assert.ok(!job.headers['Upstash-Forward-Authorization'].includes('fixture-token'))
    assert.deepEqual(Object.keys(job.body), ['id'])
    const at = Number(job.headers['Upstash-Not-Before']) * 1000
    assert.ok(at > before.getTime() && at <= before.getTime() + 6 * 24 * hour)
  }
  assert.equal(h.api.seasonalPushAuthorized('Bearer fake'), false)
  assert.equal(h.api.seasonalPushAuthorized(undefined), false)
})

test('local and preview never queue or send; missing token is clearly reported', async () => {
  for (const options of [{ env: '' }, { env: 'preview' }, { token: '' }]) {
    const h = setup(options)
    const status = await h.api.scheduleSeasonalPushes(before)
    assert.equal(status.status, options.token === '' ? 'not-configured' : 'development')
    await h.api.deliverSeasonalPush({ id: h.config[0].id }, new Date(h.config[0].at))
    assert.equal(h.jobs.length, 0)
    assert.equal(h.pushes.length, 0)
  }
})

test('long delays relay without sending early, and failures can be retried', async () => {
  const h = setup()
  h.failQueue(true)
  await assert.rejects(h.api.scheduleSeasonalPushes(before), /queue unavailable/)
  h.failQueue(false)
  await h.api.scheduleSeasonalPushes(before)
  const job = h.config[4]
  const first = h.jobs.find((queued) => queued.body.id === job.id)
  await h.api.deliverSeasonalPush(
    first.body,
    new Date(Number(first.headers['Upstash-Not-Before']) * 1000),
  )
  assert.equal(h.pushes.length, 0)
  assert.equal(h.jobs.length, 6)
  assert.ok(
    Number(h.jobs.at(-1).headers['Upstash-Not-Before']) * 1000 >
      Number(first.headers['Upstash-Not-Before']) * 1000,
  )
})

test('recipient filters run on delivery; paid membership is authoritative', async () => {
  const h = setup()
  h.user('Nicole')
  h.user('Mathias')
  h.user('Norsk')
  h.user(' TOBIAS FROST ')
  await h.api.scheduleSeasonalPushes(before)
  h.wallets.nicole = { claims: { 'parcel-entry:2026': 'paid' } }
  const reminder = h.config[1]
  await h.api.deliverSeasonalPush({ id: reminder.id }, new Date(reminder.at))
  assert.deepEqual(Array.from(h.pushes[0].subs, (s) => s.endpoint).sort(), ['Mathias', 'Norsk'])
  h.wallets.norsk = { claims: { 'parcel-entry:2026': 'paid' } }
  const start = h.config[3]
  await h.api.deliverSeasonalPush({ id: start.id }, new Date(start.at))
  assert.deepEqual(Array.from(h.pushes[1].subs, (s) => s.endpoint).sort(), ['Nicole', 'Norsk'])
  assert.ok(h.activities.every((a) => a.name.trim() !== 'tobias frost'))
})

test('exclusions win for shared devices; preferences and subscription deduplication apply', async () => {
  const h = setup()
  h.user('Tobias Frost', ['shared', 'tobias2'])
  h.user('Nicole', ['shared', 'nico', 'nico'])
  h.user('Mathias', ['mathias'], { christmas: false })
  const job = h.config[0]
  await h.api.deliverSeasonalPush({ id: job.id, title: 'forged', url: '/admin' }, new Date(job.at))
  assert.deepEqual(
    Array.from(h.pushes[0].subs, (s) => s.endpoint),
    ['nico'],
  )
  assert.equal(h.pushes[0].message.title, job.title)
  assert.equal(h.pushes[0].message.url, job.url)
  assert.equal(h.activities.length, 2, 'activity remains available when push is muted')
})

test('concurrent callbacks send once; late and unknown jobs cannot broadcast', async () => {
  const h = setup()
  h.user('Nicole')
  const job = h.config[0]
  await Promise.all(
    Array.from({ length: 12 }, () => h.api.deliverSeasonalPush({ id: job.id }, new Date(job.at))),
  )
  assert.equal(h.pushes.length, 1)
  assert.equal(h.activities.length, 1)
  const later = h.config[1]
  await h.api.deliverSeasonalPush({ id: later.id }, new Date(Date.parse(later.at) + hour + 1))
  assert.equal(h.pushes.length, 1)
  await assert.rejects(
    h.api.deliverSeasonalPush({ id: 'forged' }, before),
    (error) => error.statusCode === 400,
  )
  const status = await h.api.seasonalPushStatus(new Date(later.at))
  assert.equal(status.jobs[0].status, 'sent')
})

test('expired subscriptions are removed from public and personal registrations', async () => {
  const h = setup()
  const user = h.user('Nicole', ['dead', 'alive'])
  h.dead(['dead'])
  const job = h.config[0]
  await h.api.deliverSeasonalPush({ id: job.id }, new Date(job.at))
  assert.equal(user.devices[0].push, undefined)
  assert.equal(user.devices[1].push.endpoint, 'alive')
  assert.deepEqual(h.removed, [['all', 'dead']])
})

test('empty board announcement is event driven, token independent and once per campaign', async () => {
  const h = setup({ token: '' })
  h.user('Nicole')
  h.user('Mathias')
  h.user('Tobias Frost')
  const now = new Date('2026-12-05T12:00:00Z')
  const game = {
    year: 2026,
    startsAt: '2026-11-27T03:00:00Z',
    endsAt: '2026-12-26T14:00:00Z',
    ended: false,
    prizesAssigned: true,
    players: ['Nicole'],
    parcels: [{ owner: 'Nicole' }, { owner: null }],
  }
  await h.api.notifyParcelTableEmpty(game, now)
  assert.equal(h.pushes.length, 0)
  game.parcels[1].owner = 'Nicole'
  for (const altered of [
    { ...game, ended: true },
    { ...game, cancelled: true },
    { ...game, prizesAssigned: false },
    { ...game, parcels: [] },
    { ...game, year: 2027 },
  ])
    await h.api.notifyParcelTableEmpty(altered, now)
  assert.equal(h.pushes.length, 0)
  await Promise.all(Array.from({ length: 12 }, () => h.api.notifyParcelTableEmpty(game, now)))
  assert.equal(h.pushes.length, 1)
  assert.deepEqual(
    Array.from(h.pushes[0].subs, (s) => s.endpoint),
    ['Nicole', 'Mathias'],
  )
  assert.equal(h.pushes[0].message.url, '/spil/pakkeleg')
})

test('cron authenticates before reading body; admin endpoints require admin first', async () => {
  const h = setup()
  let reads = 0
  const endpoint = h.load('server/api/cron/seasonal-push.post.ts', {
    defineEventHandler: (fn) => fn,
    setHeader() {},
    getHeader: () => 'Bearer invalid',
    seasonalPushAuthorized: h.api.seasonalPushAuthorized,
    readBody: async () => {
      reads++
      return {}
    },
  }).default
  await assert.rejects(endpoint({}), (error) => error.statusCode === 401)
  assert.equal(reads, 0)
  for (const verb of ['get', 'post']) {
    const route = h.load(`server/api/admin/seasonal-push.${verb}.ts`, {
      defineEventHandler: (fn) => fn,
      requireAdmin() {
        throw Object.assign(Error('auth'), { statusCode: 401 })
      },
    }).default
    await assert.rejects(route({}), (error) => error.statusCode === 401)
  }
})
