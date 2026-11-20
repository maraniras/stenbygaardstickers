import { createHmac, timingSafeEqual } from 'node:crypto'

// Explicitly requested delivery test. No arbitrary recipients or messages are accepted.
const ID = 'mathias-2026-11-20-1130'
const AT = Date.parse('2026-11-20T10:30:00.000Z')
const STORE = 'push:one-off-tests'
const DESTINATION = 'https://stenbygaardstickers.vercel.app/api/cron/push-test'
const active = () =>
  process.env.VERCEL_ENV === 'production' && redisEnabled && !!process.env.QSTASH_TOKEN
const signature = () =>
  createHmac('sha256', process.env.QSTASH_TOKEN || '')
    .update('one-off-push-v1')
    .digest('hex')

export function oneOffPushAuthorized(value: string | undefined) {
  if (!active() || !value) return false
  const expected = Buffer.from(`Bearer ${signature()}`)
  const actual = Buffer.from(value)
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

let planning: Promise<void> | undefined
let planned = false
export function scheduleOneOffPush(now = new Date()): Promise<void> {
  if (!active() || now.getTime() >= AT || planned) return Promise.resolve()
  if (planning) return planning
  planning = (async () => {
    const [existing] = await redis([['HGET', STORE, `queued:${ID}`]])
    if (!existing) {
      await $fetch(`https://qstash.upstash.io/v2/publish/${DESTINATION}`, {
        method: 'POST',
        timeout: 10_000,
        retry: 0,
        headers: {
          Authorization: `Bearer ${process.env.QSTASH_TOKEN}`,
          'Content-Type': 'application/json',
          'Upstash-Forward-Authorization': `Bearer ${signature()}`,
          'Upstash-Not-Before': String(AT / 1000),
          'Upstash-Deduplication-Id': ID,
          'Upstash-Retries': '3',
        },
        body: { id: ID },
      })
      await redis([['HSET', STORE, `queued:${ID}`, now.toISOString()]])
    }
    planned = true
  })()
    .catch(() => {
      console.error('Kunne ikke planlægge Mathias’ aftalte push-test.')
    })
    .finally(() => {
      planning = undefined
    })
  return planning
}

export async function deliverOneOffPush(body: unknown, now = new Date()) {
  if (
    !active() ||
    (body as { id?: unknown } | null)?.id !== ID ||
    now.getTime() < AT ||
    now.getTime() > AT + 5 * 60_000
  )
    return { skipped: true }
  const found = await findUser('Mathias')
  if (!found) return { skipped: true }
  const subs = [
    ...new Map(
      Object.values(found.user.devices).flatMap((device) =>
        device.push ? [[device.push.endpoint, device.push] as const] : [],
      ),
    ).values(),
  ]
  if (!subs.length) return { skipped: true, devices: 0 }
  const [claimed] = await redis([['HSETNX', STORE, `sent:${ID}`, now.toISOString()]])
  if (!claimed) return { skipped: true }
  await sendPush(subs, {
    title: '🔔 Test af planlagt notifikation',
    body: 'Hej Mathias! Dette er din testbesked til kl. 11.30.',
    url: '/mig',
    tag: ID,
  })
  return { sent: true, devices: subs.length }
}
