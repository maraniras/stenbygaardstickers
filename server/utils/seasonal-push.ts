import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import { SEASONAL_PUSH_JOBS, type SeasonalPushJob } from '../data/seasonal-push'
import type { ParcelGame } from '../../shared/types/parcel-game'
import type { PushMessage } from './push'
import type { NotifyType } from '../../shared/utils/notify'
import { gameDay } from '../../shared/utils/game-day'
import { PARCEL_DAILY_ROLLS } from '../../shared/utils/parcel-game'

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
  const nextRollReminder = SEASONAL_PUSH_JOBS.find(
    (job) => job.audience === 'unused-rolls' && Date.parse(job.at) >= now.getTime(),
  )
  for (const job of SEASONAL_PUSH_JOBS) {
    // Queue only the next evening; its callback schedules the following day, even with no visitors.
    if (job.audience === 'unused-rolls' && job !== nextRollReminder) continue
    if (Date.parse(job.at) < now.getTime() || saved[`sent:${job.id}`] || saved[`queued:${job.id}`])
      continue
    await queue(job, now)
  }
  return seasonalPushStatus(now)
}

async function queueNextRollReminder(job: SeasonalPushJob, now: Date) {
  const next = SEASONAL_PUSH_JOBS.find(
    (candidate) =>
      candidate.audience === 'unused-rolls' &&
      candidate.at > job.at &&
      Date.parse(candidate.at) >= now.getTime(),
  )
  if (!next) return
  const saved = await state()
  if (!saved[`queued:${next.id}`] && !saved[`sent:${next.id}`]) await queue(next, now)
}

/** One board read and at most three personalized push batches per evening. No per-user polling. */
async function remindUnusedParcelRolls(job: SeasonalPushJob, now: Date) {
  const users = await listUsers()
  let game = (await parcelBackup())['2026']
  if (!game) {
    // Enrollment may be paid even if nobody has opened the board since the campaign started.
    const wallets = await allEconomyRecords()
    const names = users
      .filter(
        (user) => !user.deactivatedAt && wallets[nameKey(user.name)]?.claims['parcel-entry:2026'],
      )
      .map((user) => user.name)
    const created = await mutateParcels(2026, names, (board) => prepareParcelRewards(board, now))
    game = created.game
  }
  if (game.cancelled || game.ended || now.getTime() >= Date.parse(game.endsAt))
    return { skipped: true, finished: true }
  if (now.getTime() < Date.parse(game.startsAt)) return { skipped: true }
  if (!(await claim(job.id, now))) return { skipped: true }
  const day = gameDay(now)
  const participants = new Map(game.players.map((name) => [nameKey(name), name]))
  const blocked = new Set(
    users
      .filter((user) => user.deactivatedAt || excluded(user.name) || !wants(user.notify, 'parcels'))
      .flatMap((user) =>
        Object.values(user.devices).flatMap((device) =>
          device.push ? [device.push.endpoint] : [],
        ),
      ),
  )
  const groups = new Map<number, typeof users>()
  for (const user of users) {
    const name = participants.get(nameKey(user.name))
    if (!name || user.deactivatedAt || excluded(user.name)) continue
    const remaining = Math.max(
      0,
      PARCEL_DAILY_ROLLS - (game.turns[`u:${name}`]?.[day]?.length ?? 0),
    )
    if (!remaining) continue
    const group = groups.get(remaining) ?? []
    group.push(user)
    groups.set(remaining, group)
  }
  const sentEndpoints = new Set<string>(),
    gone = new Set<string>()
  for (const [remaining, group] of groups) {
    const message: PushMessage = {
      title: `Du har ${remaining} terningeslag tilbage 🎲`,
      body: 'Husk dagens slag i pakkelegen – de nulstilles kl. 04.00.',
      url: '/spil/pakkeleg',
      tag: job.id,
    }
    await Promise.allSettled(
      group.map((user) => saveActivity(nameKey(user.name), [{ type: 'parcels', message }])),
    )
    const subscriptions = new Map(
      group
        .filter((user) => wants(user.notify, 'parcels'))
        .flatMap((user) =>
          Object.values(user.devices).flatMap((device) =>
            device.push &&
            !blocked.has(device.push.endpoint) &&
            !sentEndpoints.has(device.push.endpoint)
              ? [[device.push.endpoint, device.push] as const]
              : [],
          ),
        ),
    )
    for (const endpoint of subscriptions.keys()) sentEndpoints.add(endpoint)
    if (subscriptions.size)
      for (const endpoint of await sendPush([...subscriptions.values()], message))
        gone.add(endpoint)
  }
  for (const endpoint of gone) await removeSub('all', endpoint)
  for (const user of users) {
    if (
      !Object.values(user.devices).some((device) => device.push && gone.has(device.push.endpoint))
    )
      continue
    await updateUser(nameKey(user.name), (current) => {
      for (const device of Object.values(current.devices))
        if (device.push && gone.has(device.push.endpoint)) delete device.push
    })
  }
  return { sent: true, devices: sentEndpoints.size }
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
  if (job.audience !== 'unused-rolls' && (await state())[`sent:${job.id}`]) return { skipped: true }
  const target = Date.parse(job.at)
  if (now.getTime() < target) {
    await queue(job, now)
    return { relayed: true }
  }
  if (job.audience === 'unused-rolls') {
    const result =
      now.getTime() - target > HOUR ? { skipped: true } : await remindUnusedParcelRolls(job, now)
    if (!('finished' in result)) await queueNextRollReminder(job, now)
    return result
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
