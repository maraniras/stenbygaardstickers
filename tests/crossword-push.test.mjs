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
function setup({ env = 'production', token = 'fixture-token', id = '1' } = {}) {
  const state = {
    ...(id === 'marvel' ? { id } : {}),
    opensAt: opening,
    winner: null,
    finished: {},
    attempts: {},
  }
  const readIds = [],
    mutateIds = []
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
    readCrossword: async (id) => {
      readIds.push(id)
      return structuredClone(state)
    },
    mutateCrossword: async (fn, id) => {
      mutateIds.push(id)
      return { result: fn(state), state }
    },
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
    readIds,
    mutateIds,
    state,
    jobs,
    pushes,
    users,
    publicSubs,
    prefs,
    env: context.process.env,
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

test('three server-side jobs target 24 hours, one hour before opening and the opening instant', async () => {
  const h = setup()
  assert.equal(
    await h.api.scheduleCrosswordPushes(h.state, new Date(time - 48 * hour)),
    'scheduled',
  )
  assert.deepEqual(
    h.jobs.map((j) => Number(j.headers['Upstash-Not-Before'])),
    [(time - 24 * hour) / 1000, (time - hour) / 1000, time / 1000],
  )
  assert.deepEqual(
    h.jobs.map((j) => j.body.kind),
    ['day-before', 'reminder', 'opened'],
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

test('deploy automatically upgrades a legacy push plan without changing the date or broadcasting an announcement', async () => {
  const h = setup()
  h.state.pushSchedule = { opensAt: opening, status: 'scheduled' }
  assert.equal(h.api.crosswordPushStatus(h.state), 'pending')
  const now = new Date(time - 48 * hour)
  await Promise.all(Array.from({ length: 12 }, () => h.api.checkCrosswordPushSchedule(now)))
  assert.equal(h.state.opensAt, opening)
  assert.equal(h.jobs.length, 3)
  assert.equal(h.pushes.length, 0)
  assert.equal(h.api.crosswordPushStatus(h.state), 'scheduled')
  await h.api.checkCrosswordPushSchedule(new Date(now.getTime() + 6 * 60000))
  assert.equal(h.jobs.length, 3, 'current plans are not published again')
  h.env.QSTASH_TOKEN = 'replacement-fixture-token'
  assert.equal(h.api.crosswordPushStatus(h.state), 'pending')
  await h.api.checkCrosswordPushSchedule(new Date(now.getTime() + 12 * 60000))
  assert.equal(h.jobs.length, 6, 'token rotation repairs future callback authorization')
  assert.equal(h.pushes.length, 0)
  assert.equal(
    h.api.crosswordPushAuthorized(h.jobs.at(-1).headers['Upstash-Forward-Authorization']),
    true,
  )
})

test('automatic planning retries a failed publish after five minutes without announcing the date', async () => {
  const h = setup(),
    now = new Date(time - 48 * hour)
  h.failQueue(true)
  await h.api.checkCrosswordPushSchedule(now)
  assert.equal(h.api.crosswordPushStatus(h.state), 'failed')
  h.failQueue(false)
  await h.api.checkCrosswordPushSchedule(new Date(now.getTime() + 60000))
  assert.equal(h.jobs.length, 0)
  await h.api.checkCrosswordPushSchedule(new Date(now.getTime() + 5 * 60000))
  assert.equal(h.jobs.length, 3)
  assert.equal(h.pushes.length, 0)
})

test('automatic planning never sends old reminders, schedules ended games, or runs locally', async () => {
  const now = new Date(time - 30 * 60000)
  const h = setup()
  await h.api.checkCrosswordPushSchedule(now)
  assert.deepEqual(
    h.jobs.map((job) => job.body.kind),
    ['opened'],
  )
  assert.equal(h.pushes.length, 0)
  for (const options of [{ env: '' }, { env: 'preview' }, { token: '' }]) {
    const inactive = setup(options)
    await inactive.api.checkCrosswordPushSchedule(now)
    assert.equal(inactive.jobs.length, 0)
    assert.equal(inactive.pushes.length, 0)
  }
  for (const change of [
    (state) => {
      state.opensAt = null
    },
    (state) => {
      state.winner = { name: 'Nicole', at: opening }
    },
  ]) {
    const ended = setup()
    change(ended.state)
    await ended.api.checkCrosswordPushSchedule(now)
    assert.equal(ended.jobs.length, 0)
  }
  const expired = setup()
  await expired.api.checkCrosswordPushSchedule(new Date(time + 1))
  assert.equal(expired.jobs.length, 0)
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
  assert.equal(h.pushes.length, 1, 'only the immediate start-date announcement was sent')
  assert.ok(h.state.pushSent[opening].announced)
})

test('local/preview environments and unscheduled games never publish; missing QStash still allows immediate announcements', async () => {
  for (const options of [{ env: '' }, { env: 'preview' }]) {
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
  const noQueue = setup({ token: '' })
  assert.equal(
    await noQueue.api.scheduleCrosswordPushes(noQueue.state, new Date(time - 2 * hour)),
    'not-configured',
  )
  assert.equal(noQueue.jobs.length, 0)
  assert.equal(noQueue.pushes.length, 1)
  assert.equal(noQueue.api.crosswordPushAuthorized('anything'), false)
})

test('each stage broadcasts once under concurrent callbacks, with separate destinations', async () => {
  const h = setup()
  h.publicSubs.push(sub('anonymous'))
  for (const [kind, now] of [
    ['day-before', time - 24 * hour],
    ['reminder', time - hour],
    ['opened', time],
  ]) {
    await Promise.all(
      Array.from({ length: 12 }, () =>
        h.api.deliverCrosswordPush({ opensAt: opening, kind }, new Date(now)),
      ),
    )
  }
  assert.equal(h.pushes.length, 3)
  assert.equal(h.pushes[0].message.url, '/spil/oevrige')
  assert.equal(h.pushes[1].message.url, '/spil/oevrige')
  assert.equal(h.pushes[2].message.url, '/spil/krydsord')
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

test('start announcements show Danish weekday/date/time, deduplicate saves and allow a new future date', async () => {
  const h = setup()
  h.publicSubs.push(sub('subscriber'))
  const before = new Date(time - 48 * hour)
  await Promise.all(
    Array.from({ length: 12 }, () =>
      h.api.announceCrosswordOpening(structuredClone(h.state), before),
    ),
  )
  assert.equal(h.pushes.length, 1)
  assert.match(h.pushes[0].message.body, /tirsdag.*1\. december 2026 kl\. 20:00/)
  assert.match(h.pushes[0].message.body, /1\.000 bananer/)
  assert.equal(h.pushes[0].message.url, '/spil/oevrige')
  assert.match(h.api.crosswordOpeningLabel('2027-07-01T18:00:00.000Z'), /kl\. 20:00$/)
  const original = h.pushes[0].message.tag
  h.state.opensAt = new Date(time + 24 * hour).toISOString()
  await h.api.announceCrosswordOpening(h.state, before)
  assert.equal(h.pushes.length, 2)
  assert.notEqual(h.pushes[1].message.tag, original)
  assert.match(h.pushes[1].message.body, /onsdag.*2\. december/)
  await h.api.announceCrosswordOpening(h.state, new Date(time + 48 * hour))
  assert.equal(h.pushes.length, 2)
})

test('announcements cannot send a superseded or cancelled date after recipient lookup', async () => {
  for (const next of [null, new Date(time + hour).toISOString()]) {
    const h = setup()
    const candidate = structuredClone(h.state)
    h.duringLookup(() => {
      h.state.opensAt = next
    })
    await h.api.announceCrosswordOpening(candidate, new Date(time - 48 * hour))
    assert.equal(h.pushes.length, 0)
    assert.equal(h.state.pushSent, undefined)
  }
})

test('24-hour reminders expire after an hour, skip short notice and stop after a winner', async () => {
  const h = setup()
  await h.api.deliverCrosswordPush(
    { opensAt: opening, kind: 'day-before' },
    new Date(time - 23 * hour + 1),
  )
  assert.equal(h.pushes.length, 0)
  await h.api.scheduleCrosswordPushes(h.state, new Date(time - 2 * hour))
  assert.deepEqual(
    h.jobs.map((j) => j.body.kind),
    ['reminder', 'opened'],
  )
  const count = h.pushes.length
  h.state.winner = { name: 'Nicole', at: opening }
  for (const [kind, stamp] of [
    ['day-before', time - 24 * hour],
    ['reminder', time - hour],
    ['opened', time],
  ])
    await h.api.deliverCrosswordPush({ opensAt: opening, kind }, new Date(stamp))
  assert.equal(h.pushes.length, count)
})

test('winner announcement is once globally, respects preferences and works without QStash', async () => {
  const h = setup({ token: '' })
  h.state.winner = { name: 'Nicole', at: opening }
  h.publicSubs.push(sub('member'), sub('muted'), sub('guest'))
  h.users.push({ name: 'Nicole', devices: { a: { push: sub('member') } } })
  h.prefs.muted = { crossword: false }
  await Promise.all(
    Array.from({ length: 12 }, () =>
      h.api.announceCrosswordWinner(structuredClone(h.state), new Date(time)),
    ),
  )
  assert.equal(h.pushes.length, 1)
  assert.deepEqual(Array.from(h.pushes[0].subs, (s) => s.endpoint).sort(), ['guest', 'member'])
  assert.match(h.pushes[0].message.body, /Nicole.*1\.000 bananer/)
  assert.match(h.pushes[0].message.body, /stadig løse/)
  assert.equal(h.pushes[0].message.url, '/spil/krydsord')
  assert.equal(h.state.winnerPushSentAt, opening)
  for (const env of ['', 'preview']) {
    const local = setup({ env })
    local.state.winner = h.state.winner
    await local.api.announceCrosswordWinner(local.state, new Date(time))
    assert.equal(local.pushes.length, 0)
  }
})

test('failed winner lookup is retryable and cannot fail a successful solution response', async () => {
  const h = setup()
  h.state.winner = { name: 'Nicole', at: opening }
  h.failLookup(true)
  await h.api.notifyCrosswordWinnerLater({}, h.state)
  assert.equal(h.state.winnerPushSentAt, undefined)
  h.failLookup(false)
  const jobs = []
  await h.api.notifyCrosswordWinnerLater({ waitUntil: (job) => jobs.push(job) }, h.state)
  await Promise.all(jobs)
  assert.equal(h.pushes.length, 1)
  assert.ok(h.state.winnerPushSentAt)
})

test('Marvel push jobs, receipts and destinations are scoped to Marvel', async () => {
  const h = setup({ id: 'marvel' })
  h.publicSubs.push(sub('reader'))
  await h.api.scheduleCrosswordPushes(h.state, new Date(time - 48 * hour))
  assert.equal(h.jobs.length, 3)
  for (const job of h.jobs) assert.equal(job.body.id, 'marvel')
  assert.match(h.pushes[0].message.title, /Doomsday Special/)
  assert.match(h.pushes[0].message.body, /500 bananer/)
  assert.ok(!h.pushes[0].message.body.includes('kop'))
  await h.api.deliverCrosswordPush(
    { id: 'marvel', opensAt: opening, kind: 'reminder' },
    new Date(time - hour),
  )
  assert.match(h.pushes.at(-1).message.title, /Doomsday Special.*snart/)
  assert.equal(h.pushes.at(-1).message.url, '/spil/oevrige')
  await h.api.deliverCrosswordPush(
    { id: 'marvel', opensAt: opening, kind: 'opened' },
    new Date(time),
  )
  assert.equal(h.readIds.at(-1), 'marvel')
  assert.equal(h.pushes.at(-1).message.url, '/spil/krydsord?id=marvel')
  assert.match(h.pushes.at(-1).message.body, /500 bananer/)
  h.state.winner = { name: 'Anna', at: opening }
  await h.api.announceCrosswordWinner(h.state, new Date(time))
  assert.equal(h.pushes.at(-1).message.tag, 'crossword-marvel-winner')
  assert.ok(h.mutateIds.every((id) => id === 'marvel'))
  const legacy = setup()
  await legacy.api.scheduleCrosswordPushes(legacy.state, new Date(time - 48 * hour))
  assert.notEqual(
    legacy.jobs[0].headers['Upstash-Deduplication-Id'],
    h.jobs[0].headers['Upstash-Deduplication-Id'],
  )
  await assert.rejects(
    h.api.deliverCrosswordPush({ id: 'other', opensAt: opening, kind: 'opened' }, new Date(time)),
    { statusCode: 400 },
  )
})
