import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import type { CrosswordState } from '../../shared/types/crossword'
import type { PushMessage } from './push'

type CrosswordPushKind = 'day-before' | 'reminder' | 'opened'
interface CrosswordPushJob {
  opensAt: string
  kind: CrosswordPushKind
}
const HOUR = 3600_000
// Stay below the free QStash seven-day delay limit, relaying longer schedules.
const MAX_DELAY = 6 * 24 * HOUR
const DESTINATION = 'https://stenbygaardstickers.vercel.app/api/cron/crossword'
const active = () => process.env.VERCEL_ENV === 'production' && redisEnabled
const targetTime = (job: CrosswordPushJob) =>
  Date.parse(job.opensAt) -
  (job.kind === 'day-before' ? 24 * HOUR : job.kind === 'reminder' ? HOUR : 0)
const sent = (state: CrosswordState, job: CrosswordPushJob) =>
  !!state.pushSent?.[job.opensAt]?.[job.kind]

function callbackToken() {
  return createHmac('sha256', process.env.QSTASH_TOKEN || '')
    .update('crossword-push-v1')
    .digest('hex')
}
export function crosswordPushAuthorized(authorization: string | undefined) {
  if (!active() || !process.env.QSTASH_TOKEN || !authorization) return false
  const expected = Buffer.from(`Bearer ${callbackToken()}`)
  const actual = Buffer.from(authorization)
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}
export function crosswordPushStatus(state: CrosswordState) {
  if (!active()) return 'development' as const
  if (!process.env.QSTASH_TOKEN) return 'not-configured' as const
  if (!state.opensAt) return 'unscheduled' as const
  return state.pushSchedule?.opensAt === state.opensAt
    ? state.pushSchedule.status
    : ('pending' as const)
}
async function queueCrosswordPush(job: CrosswordPushJob, now: Date) {
  const target = targetTime(job)
  if (!Number.isFinite(target)) throw new Error('Invalid crossword push time')
  // Anchor relay times to the target, so repeated scheduling has stable deduplication IDs.
  let deliverAt = target
  if (deliverAt - now.getTime() > MAX_DELAY)
    deliverAt -= Math.ceil((deliverAt - now.getTime()) / MAX_DELAY - 1) * MAX_DELAY
  const timestamp = Math.ceil(Math.max(deliverAt, now.getTime()) / 1000)
  const base = (process.env.QSTASH_URL || 'https://qstash.upstash.io').replace(/\/$/, '')
  if (!/^https:\/\/qstash(?:-[a-z0-9-]+)?\.upstash\.io$/.test(base))
    throw new Error('Invalid QStash URL')
  await $fetch(`${base}/v2/publish/${DESTINATION}`, {
    method: 'POST',
    timeout: 10_000,
    retry: 0,
    headers: {
      Authorization: `Bearer ${process.env.QSTASH_TOKEN}`,
      'Content-Type': 'application/json',
      'Upstash-Forward-Authorization': `Bearer ${callbackToken()}`,
      'Upstash-Not-Before': String(timestamp),
      'Upstash-Retries': '3',
      'Upstash-Timeout': '30s',
      'Upstash-Deduplication-Id': createHash('sha256')
        .update(`${job.opensAt}:${job.kind}:${timestamp}`)
        .digest('hex'),
    },
    body: job,
  })
}

/** Called when admin saves a time. No external jobs or pushes are created locally or on preview. */
export async function scheduleCrosswordPushes(state: CrosswordState, now = new Date()) {
  if (!active() || !state.opensAt) return crosswordPushStatus(state)
  const opensAt = state.opensAt
  let status: 'scheduled' | 'failed' = 'scheduled'
  try {
    await announceCrosswordOpening(state, now)
  } catch {
    status = 'failed'
    console.error('Kunne ikke annoncere krydsordets starttidspunkt.')
  }
  if (!process.env.QSTASH_TOKEN) return crosswordPushStatus(state)
  try {
    for (const kind of ['day-before', 'reminder', 'opened'] as const) {
      const job = { opensAt, kind }
      if (targetTime(job) >= now.getTime() && !sent(state, job)) await queueCrosswordPush(job, now)
    }
  } catch {
    status = 'failed'
    console.error('Kunne ikke planlægge krydsordets pushbeskeder.')
  }
  await mutateCrossword((current) => {
    if (current.opensAt === opensAt) current.pushSchedule = { opensAt, status }
  })
  return status
}

/** Authenticated delayed callback. Stale/cancelled schedules and duplicate deliveries are harmless. */
export async function deliverCrosswordPush(body: unknown, now = new Date()) {
  if (!active() || !process.env.QSTASH_TOKEN) return { skipped: true }
  const candidate = body as Partial<CrosswordPushJob> | null
  if (
    !candidate ||
    typeof candidate.opensAt !== 'string' ||
    !['day-before', 'reminder', 'opened'].includes(candidate.kind || '') ||
    !Number.isFinite(Date.parse(candidate.opensAt))
  )
    throw createError({ statusCode: 400, statusMessage: 'Ugyldig krydsordsbesked.' })
  const job = candidate as CrosswordPushJob
  const state = await readCrossword()
  if (state.opensAt !== job.opensAt || state.winner || sent(state, job)) return { skipped: true }
  const target = targetTime(job)
  if (now.getTime() < target) {
    await queueCrosswordPush(job, now)
    return { relayed: true }
  }
  const expired = () =>
    job.kind === 'day-before'
      ? now.getTime() - target > HOUR || now.getTime() >= Date.parse(job.opensAt)
      : job.kind === 'reminder'
        ? now.getTime() >= Date.parse(job.opensAt)
        : now.getTime() - target > HOUR
  if (expired()) return { skipped: true }

  const opening = crosswordOpeningLabel(job.opensAt)
  return broadcastCrosswordPush(
    {
      title:
        job.kind === 'day-before'
          ? '🧩 Kryds & tværs #1 åbner om 24 timer'
          : job.kind === 'reminder'
            ? '🧩 Kryds & tværs #1 åbner snart'
            : '🧩 Kryds & tværs #1 er åbent!',
      body:
        job.kind !== 'opened'
          ? `Vi starter ${opening}. Første korrekte løsning vinder en RTA-kop, 1.000 bananer og en særlig badge.`
          : 'Nu kan du spille! Første korrekte løsning vinder en RTA-kop, 1.000 bananer og en særlig badge.',
      url: job.kind !== 'opened' ? '/spil/oevrige' : '/spil/krydsord',
      tag: `crossword-1-${job.kind}-${Date.parse(job.opensAt)}`,
    },
    async () =>
      (
        await mutateCrossword((current) => {
          if (current.opensAt !== job.opensAt || current.winner || sent(current, job) || expired())
            return false
          current.pushSent ??= {}
          current.pushSent[job.opensAt] ??= {}
          current.pushSent[job.opensAt]![job.kind] = now.toISOString()
          return true
        })
      ).result,
  )
}

export function crosswordOpeningLabel(opensAt: string) {
  const date = new Date(opensAt)
  const day = date.toLocaleDateString('da-DK', {
    timeZone: 'Europe/Copenhagen',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const time = date
    .toLocaleTimeString('da-DK', {
      timeZone: 'Europe/Copenhagen',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
    .replace('.', ':')
  return `${day} kl. ${time}`
}

export async function announceCrosswordOpening(state: CrosswordState, now = new Date()) {
  const opensAt = state.opensAt
  if (
    !active() ||
    !opensAt ||
    state.winner ||
    Date.parse(opensAt) <= now.getTime() ||
    state.pushSent?.[opensAt]?.announced
  )
    return { skipped: true }
  return broadcastCrosswordPush(
    {
      title: '🧩 Kryds & tværs #1 har fået en startdato',
      body: `Vi starter ${crosswordOpeningLabel(opensAt)}. Første korrekte løsning vinder en RTA-kop, 1.000 bananer og en særlig badge.`,
      url: '/spil/oevrige',
      tag: `crossword-1-announced-${Date.parse(opensAt)}`,
    },
    async () =>
      (
        await mutateCrossword((current) => {
          if (
            current.opensAt !== opensAt ||
            current.winner ||
            current.pushSent?.[opensAt]?.announced
          )
            return false
          current.pushSent ??= {}
          current.pushSent[opensAt] ??= {}
          current.pushSent[opensAt]!.announced = now.toISOString()
          return true
        })
      ).result,
  )
}

export async function announceCrosswordWinner(state: CrosswordState, now = new Date()) {
  const winner = state.winner
  if (!active() || !winner || state.winnerPushSentAt) return { skipped: true }
  return broadcastCrosswordPush(
    {
      title: '🏆 Kryds & tværs #1 har fået en vinder!',
      body: `${winner.name} løste krydsordet først og vandt en RTA-kop, 1.000 bananer og vinderbadgen. Du kan stadig løse det færdigt.`,
      url: '/spil/krydsord',
      tag: 'crossword-1-winner',
    },
    async () =>
      (
        await mutateCrossword((current) => {
          if (
            current.winnerPushSentAt ||
            current.winner?.name !== winner.name ||
            current.winner?.at !== winner.at
          )
            return false
          current.winnerPushSentAt = now.toISOString()
          return true
        })
      ).result,
  )
}

/** A failed notification never turns a correct crossword solution into an API error. */
export async function notifyCrosswordWinnerLater(
  event: Parameters<typeof getHeader>[0],
  state: CrosswordState,
) {
  if (!active() || !state.winner || state.winnerPushSentAt) return
  const job = announceCrosswordWinner(state).catch(() => {
    console.error('Kunne ikke annoncere krydsordets vinder.')
  })
  if (typeof event.waitUntil === 'function') event.waitUntil(job)
  else await job
}

async function broadcastCrosswordPush(message: PushMessage, claim: () => Promise<boolean>) {
  // Lookup can fail without consuming the receipt. Preferences are checked at delivery time.
  const [publicSubs, users, muted] = await Promise.all([
    allSubs('all'),
    listUsers(),
    mutedEndpoints('crossword'),
  ])
  const subscriptions = new Map(publicSubs.map((sub) => [sub.endpoint, sub]))
  for (const user of users)
    for (const device of Object.values(user.devices))
      if (device.push) subscriptions.set(device.push.endpoint, device.push)
  for (const endpoint of muted) subscriptions.delete(endpoint)
  const claimed = await claim()
  if (!claimed) return { skipped: true }
  const gone = await sendPush([...subscriptions.values()], message)
  for (const endpoint of gone) await removeSub('all', endpoint)
  const expiredEndpoints = new Set(gone)
  for (const user of users) {
    if (
      !Object.values(user.devices).some(
        (device) => device.push && expiredEndpoints.has(device.push.endpoint),
      )
    )
      continue
    await updateUser(nameKey(user.name), (current) => {
      for (const device of Object.values(current.devices))
        if (device.push && expiredEndpoints.has(device.push.endpoint)) delete device.push
    })
  }
  return { sent: true }
}
