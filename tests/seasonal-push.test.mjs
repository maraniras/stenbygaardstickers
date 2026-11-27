import assert from 'node:assert/strict'
import test from 'node:test'
import vm from 'node:vm'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve, dirname } from 'node:path'
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
      {
        ...context,
        require: (id) =>
          id.startsWith('.') ? load(resolve(dirname(path), id + '.ts')) : nativeRequire(id),
        ...additions,
        exports,
      },
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

test('approved dates and daily reminders use Danish winter time and queue only the next evening', async () => {
  const h = setup()
  assert.deepEqual(
    Array.from(
      h.config.filter((job) => job.audience !== 'unused-rolls'),
      (job) => job.at,
    ),
    [
      '2026-11-20T05:30:00.000Z',
      '2026-11-21T07:00:00.000Z',
      '2026-11-26T07:00:00.000Z',
      '2026-11-27T05:30:00.000Z',
      '2026-12-01T05:30:00.000Z',
      '2027-01-01T11:00:00.000Z',
    ],
  )
  assert.deepEqual(
    Array.from(
      h.config.filter((job) => job.audience !== 'unused-rolls'),
      (job) => job.url,
    ),
    [
      '/spil/jul',
      '/spil/pakkeleg',
      '/spil/pakkeleg',
      '/spil/pakkeleg',
      '/spil/julekalender',
      '/spil/bananer',
    ],
  )
  assert.ok(h.config.every((job) => job.title && job.body && !job.title.includes(' - ')))
  await h.api.scheduleSeasonalPushes(before)
  assert.equal(h.jobs.length, 7)
  await h.api.scheduleSeasonalPushes(before)
  assert.equal(h.jobs.length, 7)
  const reminders = h.config.filter((job) => job.audience === 'unused-rolls')
  assert.equal(reminders.length, 35)
  assert.equal(reminders[0].at, '2026-11-27T19:00:00.000Z')
  assert.equal(reminders.at(-1).at, '2026-12-31T19:00:00.000Z')
  assert.equal(h.jobs.filter((job) => job.body.id.startsWith('parcel-unused-rolls')).length, 1)
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

test('new-year push sends at January 1 noon, respects gift preferences and does not grant bananas', async () => {
  const h = setup()
  h.user('Nicole')
  h.user('Anna', ['anna'], { gifts: false })
  const job = h.config.find((job) => job.id === 'new-year-gift-2027')
  assert.equal(job.at, '2027-01-01T11:00:00.000Z')
  assert.equal(job.url, '/spil/bananer')
  assert.ok(job.body.includes('500'))
  await h.api.deliverSeasonalPush({ id: job.id }, new Date('2027-01-01T10:59:59Z'))
  assert.equal(h.pushes.length, 0)
  await h.api.deliverSeasonalPush({ id: job.id }, new Date(job.at))
  await h.api.deliverSeasonalPush({ id: job.id }, new Date(job.at))
  assert.equal(h.pushes.length, 1)
  assert.deepEqual(
    Array.from(h.pushes[0].subs, (sub) => sub.endpoint),
    ['Nicole'],
  )
  assert.equal(Object.keys(h.wallets).length, 0)
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
  assert.equal(h.jobs.length, 8)
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

function reminderBoard(h) {
  const names = ['Nicole', 'Mathias', 'Anna', 'Norsk', 'Morten', 'Ida']
  h.boards['2026'] = {
    year: 2026,
    startsAt: '2026-11-27T03:00:00Z',
    endsAt: '2026-12-28T12:00:00Z',
    ended: false,
    players: names,
    parcels: [{ id: 'p1', owner: 'Nicole' }],
    turns: {},
  }
  for (const name of names) h.user(name)
  return h.boards['2026']
}
const rollDay = '2026-12-01'
const rollReminder = (h) => h.config.find((job) => job.id === `parcel-unused-rolls-${rollDay}`)
const rolls = (count) =>
  Array.from({ length: count }, (_, i) => ({ id: `r${i}`, die: 2, at: `${rollDay}T15:00:00Z` }))

test('evening reminders personalize remaining rolls and exclude finished, inactive and non-participating users', async () => {
  const h = setup(),
    game = reminderBoard(h),
    job = rollReminder(h)
  game.turns['u:Nicole'] = { [rollDay]: rolls(3) }
  game.turns['u:Mathias'] = { [rollDay]: rolls(1) }
  game.turns['u:Anna'] = { [rollDay]: rolls(2) }
  game.turns['u:Ida'] = { '2026-11-30': rolls(3) }
  h.users.find((user) => user.name === 'Morten').deactivatedAt = '2026-11-30T12:00:00Z'
  h.users.find((user) => user.name === 'Norsk').notify.parcels = false
  h.user('Spectator')
  h.user('Tobias Frost')
  game.players.push('Tobias Frost')
  await h.api.deliverSeasonalPush({ id: job.id }, new Date('2026-12-01T18:59:59Z'))
  assert.equal(h.pushes.length, 0)
  await Promise.all(
    Array.from({ length: 8 }, () => h.api.deliverSeasonalPush({ id: job.id }, new Date(job.at))),
  )
  const sent = h.pushes.flatMap(({ subs, message }) =>
    Array.from(subs, (sub) => [sub.endpoint, message.title, message.url]),
  )
  assert.deepEqual(sent.sort(), [
    ['Anna', 'Du har 1 terningeslag tilbage 🎲', '/spil/pakkeleg'],
    ['Ida', 'Du har 3 terningeslag tilbage 🎲', '/spil/pakkeleg'],
    ['Mathias', 'Du har 2 terningeslag tilbage 🎲', '/spil/pakkeleg'],
  ])
  assert.deepEqual(h.activities.map((entry) => entry.name).sort(), [
    'anna',
    'ida',
    'mathias',
    'norsk',
  ])
  // Concurrent publishers share the same provider deduplication key.
  const next = h.jobs.filter((queued) => queued.body.id === 'parcel-unused-rolls-2026-12-02')
  assert.ok(next.length)
  assert.equal(new Set(next.map((queued) => queued.headers['Upstash-Deduplication-Id'])).size, 1)
})

test('each day checks fresh roll counts and callbacks sustain reminders without app visitors', async () => {
  const h = setup(),
    game = reminderBoard(h),
    job = rollReminder(h)
  for (const name of game.players) game.turns[`u:${name}`] = { [rollDay]: rolls(3) }
  await h.api.deliverSeasonalPush({ id: job.id }, new Date(job.at))
  assert.equal(h.pushes.length, 0)
  const next = h.jobs.find((queued) => queued.body.id === 'parcel-unused-rolls-2026-12-02')
  assert.ok(next)
  game.turns['u:Nicole']['2026-12-02'] = rolls(3)
  await h.api.deliverSeasonalPush(next.body, new Date('2026-12-02T19:00:00Z'))
  assert.ok(h.pushes.length)
  assert.ok(h.pushes.every(({ subs }) => subs.every((sub) => sub.endpoint !== 'Nicole')))
  assert.equal(h.jobs.at(-1).body.id, 'parcel-unused-rolls-2026-12-03')
})

test('ended or cancelled campaigns stop reminders, including a hidden end not yet advanced', async () => {
  for (const change of [{ ended: true }, { cancelled: true }, { endsAt: '2026-12-01T18:00:00Z' }]) {
    const h = setup(),
      game = reminderBoard(h),
      job = rollReminder(h)
    Object.assign(game, change)
    await h.api.deliverSeasonalPush({ id: job.id }, new Date(job.at))
    assert.equal(h.pushes.length, 0)
    assert.equal(h.jobs.length, 0)
  }
})

test('an expired callback skips stale reminders but preserves the next evening schedule', async () => {
  const h = setup()
  reminderBoard(h)
  const job = rollReminder(h)
  await h.api.deliverSeasonalPush({ id: job.id }, new Date('2026-12-01T20:00:01Z'))
  assert.equal(h.pushes.length, 0)
  assert.equal(h.jobs[0].body.id, 'parcel-unused-rolls-2026-12-02')
})

test('a failed next-day publish can retry without sending tonight twice', async () => {
  const h = setup()
  reminderBoard(h)
  const job = rollReminder(h)
  h.failQueue(true)
  await assert.rejects(
    h.api.deliverSeasonalPush({ id: job.id }, new Date(job.at)),
    /queue unavailable/,
  )
  assert.equal(h.pushes.length, 1)
  h.failQueue(false)
  await h.api.deliverSeasonalPush({ id: job.id }, new Date(job.at))
  assert.equal(h.pushes.length, 1)
  assert.equal(h.jobs.length, 1)
})

test('first evening initializes a paid board even if nobody has opened the game', async () => {
  const h = setup()
  const game = reminderBoard(h)
  delete h.boards['2026']
  for (const name of game.players)
    h.wallets[name.toLowerCase()] = { claims: { 'parcel-entry:2026': true } }
  let created = 0
  const api = h.load('server/utils/seasonal-push.ts', {
    mutateParcels: async (year, names, change) => {
      assert.equal(year, 2026)
      assert.deepEqual(Array.from(names), game.players)
      created++
      change(game)
      return { game }
    },
    prepareParcelRewards: (board) => {
      board.prizesAssigned = true
    },
  })
  const job = rollReminder(h)
  await api.deliverSeasonalPush({ id: job.id }, new Date(job.at))
  assert.equal(created, 1)
  assert.equal(game.prizesAssigned, true)
  assert.equal(h.pushes[0].subs.length, 6)
})
