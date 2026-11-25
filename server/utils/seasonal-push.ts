import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import { SEASONAL_PUSH_JOBS, type SeasonalPushJob } from '../data/seasonal-push'
import type { ParcelGame } from '../../shared/types/parcel-game'
import type { PushMessage } from './push'
import type { NotifyType } from '../../shared/utils/notify'

const STORE = 'push:seasonal:2026'
const DESTINATION = 'https://stenbygaardstickers.vercel.app/api/cron/seasonal-push'
const HOUR = 3600_000
const MAX_DELAY = 6 * 24 * HOUR
const active = () =>
  typeof process !== 'undefined' && process.env.VERCEL_ENV === 'production' && redisEnabled
const excluded = (name: string) =>
  name.normalize('NFC').trim().toLocaleLowerCase('da') === 'tobias frost'

function callbackToken() {
  return createHmac('sha256', process.env.QSTASH_TOKEN || '')
    .update('seasonal-push-v1')
    .digest('hex')
}
export function seasonalPushAuthorized(authorization: string | undefined) {
  if (!active() || !process.env.QSTASH_TOKEN || !authorization) return false
  const expected = Buffer.from(`Bearer ${callbackToken()}`),
    actual = Buffer.from(authorization)
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}
async function state() {
  const [flat] = (await redis([['HGETALL', STORE]])) as [string[]]
  const result: Record<string, string> = {}
  for (let i = 0; i < flat.length; i += 2) result[flat[i]!] = flat[i + 1]!
  return result
}
async function claim(id: string, now: Date) {
  const [result] = (await redis([['HSETNX', STORE, `sent:${id}`, now.toISOString()]])) as [number]
  return result === 1
}
async function queue(job: SeasonalPushJob, now: Date) {
  const target = Date.parse(job.at)
  let delivery = target
  if (delivery - now.getTime() > MAX_DELAY)
    delivery -= Math.ceil((delivery - now.getTime()) / MAX_DELAY - 1) * MAX_DELAY
  const timestamp = Math.ceil(Math.max(delivery, now.getTime()) / 1000)
  const base = (process.env.QSTASH_URL || 'https://qstash.upstash.io').replace(/\/$/, '')
  if (!/^https:\/\/qstash(?:-[a-z0-9-]+)?\.upstash\.io$/.test(base))
    throw Error('Invalid QStash URL')
  await $fetch(`${base}/v2/publish/${DESTINATION}`, {
    method: 'POST',
    timeout: 10000,
    retry: 0,
    headers: {
      Authorization: `Bearer ${process.env.QSTASH_TOKEN}`,
      'Content-Type': 'application/json',
      'Upstash-Forward-Authorization': `Bearer ${callbackToken()}`,
      'Upstash-Not-Before': String(timestamp),
      'Upstash-Retries': '3',
      'Upstash-Timeout': '30s',
      'Upstash-Deduplication-Id': createHash('sha256')
        .update(`${job.id}:${timestamp}`)
        .digest('hex'),
    },
    body: { id: job.id },
  })
  await redis([['HSET', STORE, `queued:${job.id}`, now.toISOString()]])
}

export async function seasonalPushStatus(now = new Date()) {
  const saved = active() ? await state() : {}
  return {
    status: !active() ? 'development' : !process.env.QSTASH_TOKEN ? 'not-configured' : 'ready',
    jobs: SEASONAL_PUSH_JOBS.map((job) => ({
      ...job,
      status: saved[`sent:${job.id}`]
        ? 'sent'
        : now.getTime() > Date.parse(job.at) + HOUR
          ? 'expired'
          : saved[`queued:${job.id}`]
            ? 'queued'
            : 'pending',
    })),
    tableEmptySentAt: saved['sent:parcel-table-empty-2026'] ?? null,
  }
}
export async function scheduleSeasonalPushes(now = new Date()) {
  if (!active() || !process.env.QSTASH_TOKEN) return seasonalPushStatus(now)
  const saved = await state()
  for (const job of SEASONAL_PUSH_JOBS) {
    if (Date.parse(job.at) < now.getTime() || saved[`sent:${job.id}`] || saved[`queued:${job.id}`])
      continue
    await queue(job, now)
  }
  return seasonalPushStatus(now)
}

/** Only known accounts are targeted, so Tobias can be excluded reliably on every device. */
async function broadcast(
  id: string,
  message: PushMessage,
  type: NotifyType,
  audience: SeasonalPushJob['audience'],
  now: Date,
) {
  if ((await state())[`sent:${id}`]) return { skipped: true }
  const users = await listUsers()
  // Paid wallet receipts are authoritative even if enrollment's response was lost.
  const wallets = audience === 'all' ? {} : await allEconomyRecords()
  const eligible = users.filter(
    (user) =>
      !user.deactivatedAt &&
      !excluded(user.name) &&
      (audience === 'all' ||
        Boolean(wallets[nameKey(user.name)]?.claims['parcel-entry:2026']) ===
          (audience === 'joined')),
  )
  const blocked = new Set(
    users
      .filter((user) => user.deactivatedAt || excluded(user.name) || !wants(user.notify, type))
      .flatMap((user) =>
        Object.values(user.devices).flatMap((d) => (d.push ? [d.push.endpoint] : [])),
      ),
  )
  const subscriptions = new Map(
    eligible
      .filter((user) => wants(user.notify, type))
      .flatMap((user) =>
        Object.values(user.devices).flatMap((d) =>
          d.push && !blocked.has(d.push.endpoint) ? [[d.push.endpoint, d.push] as const] : [],
        ),
      ),
  )
  if (!(await claim(id, now))) return { skipped: true }
  await Promise.allSettled(
    eligible.map((user) => saveActivity(nameKey(user.name), [{ type, message }])),
  )
  const gone = new Set(await sendPush([...subscriptions.values()], message))
  for (const endpoint of gone) await removeSub('all', endpoint)
  for (const user of users) {
    if (!Object.values(user.devices).some((d) => d.push && gone.has(d.push.endpoint))) continue
    await updateUser(nameKey(user.name), (current) => {
      for (const d of Object.values(current.devices))
        if (d.push && gone.has(d.push.endpoint)) delete d.push
    })
  }
  return { sent: true, devices: subscriptions.size }
}

export async function deliverSeasonalPush(body: unknown, now = new Date()) {
  if (!active() || !process.env.QSTASH_TOKEN) return { skipped: true }
  const id = (body as { id?: unknown } | null)?.id
  const job = SEASONAL_PUSH_JOBS.find((candidate) => candidate.id === id)
  if (!job) throw createError({ statusCode: 400, statusMessage: 'Ugyldig julebesked.' })
  if ((await state())[`sent:${job.id}`]) return { skipped: true }
  const target = Date.parse(job.at)
  if (now.getTime() < target) {
    await queue(job, now)
    return { relayed: true }
  }
  if (now.getTime() - target > HOUR) return { skipped: true }
  if (job.id === 'parcel-start-2026') {
    const board = (await parcelBackup())['2026']
    if (board?.cancelled || board?.ended) return { skipped: true }
  }
  return broadcast(
    job.id,
    { title: job.title, body: job.body, url: job.url, tag: job.id },
    job.type,
    job.audience,
    now,
  )
}

/** Rechecked on every board request; the durable claim survives event-feed trimming and retries. */
export async function notifyParcelTableEmpty(game: ParcelGame, now = new Date()) {
  if (
    !active() ||
    game.year !== 2026 ||
    game.ended ||
    game.cancelled ||
    !game.prizesAssigned ||
    !game.parcels.length ||
    game.parcels.some((p) => !p.owner) ||
    now.getTime() < Date.parse(game.startsAt) ||
    now.getTime() >= Date.parse(game.endsAt)
  )
    return { skipped: true }
  return broadcast(
    `parcel-table-empty-${game.year}`,
    {
      title: 'Alle pakker er taget fra bordet',
      body: 'Nu er det tid til at stjæle.',
      url: '/spil/pakkeleg',
      tag: `parcel-table-empty-${game.year}`,
    },
    'parcels',
    'all',
    now,
  )
}

let checking: Promise<unknown> | undefined
let retryAt = 0
export function checkSeasonalPushSchedule() {
  if (!active() || !process.env.QSTASH_TOKEN || Date.now() < retryAt) return Promise.resolve()
  if (checking) return checking
  retryAt = Date.now() + 5 * 60_000
  checking = scheduleSeasonalPushes()
    .then((result) => {
      retryAt = Infinity
      return result
    })
    .catch((error) => {
      console.error('Kunne ikke planlægge julebeskeder', error)
    })
    .finally(() => {
      checking = undefined
    })
  return checking
}
