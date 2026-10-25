// Notifikationer til admins (Web Push). Hver telefon, der har slået "Få besked" til
// på /admin, gemmes som et abonnement. VAPID-nøgleparret laves automatisk første
// gang og gemmes i databasen, så der ikke skal sættes noget op på Vercel.
// Redis: "push:vapid" (JSON med nøglerne) og hashen "push:subs" (endpoint → abonnement).
import webpush, { type PushSubscription } from 'web-push'

interface Vapid { publicKey: string, privateKey: string }

let vapid: Promise<Vapid> | undefined

function getVapid() {
  vapid ??= (async () => {
    if (redisEnabled) {
      const [json] = await redis([['GET', 'push:vapid']]) as [string | null]
      if (json) return JSON.parse(json) as Vapid
      const keys = webpush.generateVAPIDKeys()
      // NX: hvis to servere laver nøgler samtidig, vinder den første
      await redis([['SET', 'push:vapid', JSON.stringify(keys), 'NX']])
      const [saved] = await redis([['GET', 'push:vapid']]) as [string]
      return JSON.parse(saved) as Vapid
    }
    const storage = useStorage('data')
    let keys = await storage.getItem<Vapid>('push-vapid')
    if (!keys) {
      keys = webpush.generateVAPIDKeys()
      await storage.setItem('push-vapid', keys)
    }
    return keys
  })().catch((err) => {
    vapid = undefined
    throw err
  })
  return vapid
}

export async function vapidPublicKey() {
  return (await getVapid()).publicKey
}

async function allSubs(): Promise<PushSubscription[]> {
  if (!redisEnabled) return Object.values((await useStorage('data').getItem<Record<string, PushSubscription>>('push-subs')) ?? {})
  const [flat] = await redis([['HVALS', 'push:subs']]) as [string[]]
  return flat.map(s => JSON.parse(s))
}

export async function addSub(sub: PushSubscription) {
  if (!redisEnabled) {
    const storage = useStorage('data')
    const subs = (await storage.getItem<Record<string, PushSubscription>>('push-subs')) ?? {}
    subs[sub.endpoint] = sub
    await storage.setItem('push-subs', subs)
    return
  }
  await redis([['HSET', 'push:subs', sub.endpoint, JSON.stringify(sub)]])
}

export async function removeSub(endpoint: string) {
  if (!redisEnabled) {
    const storage = useStorage('data')
    const subs = (await storage.getItem<Record<string, PushSubscription>>('push-subs')) ?? {}
    delete subs[endpoint]
    await storage.setItem('push-subs', subs)
    return
  }
  await redis([['HDEL', 'push:subs', endpoint]])
}

export async function hasSub(endpoint: string) {
  return (await allSubs()).some(s => s.endpoint === endpoint)
}

export function cleanSub(body: unknown): PushSubscription {
  const b = (body ?? {}) as { endpoint?: unknown, keys?: { p256dh?: unknown, auth?: unknown } }
  if (typeof b.endpoint !== 'string' || !b.endpoint.startsWith('https://') || b.endpoint.length > 1000
    || typeof b.keys?.p256dh !== 'string' || typeof b.keys?.auth !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'Ugyldigt abonnement' })
  }
  return { endpoint: b.endpoint, keys: { p256dh: b.keys.p256dh, auth: b.keys.auth } }
}

/** Sender til alle admins. Abonnementer, som telefonen har opgivet, fjernes. */
export async function notifyAdmins(message: { title: string, body: string, url: string }) {
  try {
    const subs = await allSubs()
    if (!subs.length) return
    const keys = await getVapid()
    const payload = JSON.stringify(message)
    await Promise.allSettled(subs.map(sub => webpush
      .sendNotification(sub, payload, {
        vapidDetails: { subject: 'https://stenbygaardstickers.vercel.app', ...keys },
        TTL: 60 * 60 * 24,
        timeout: 5000,
      })
      .catch(async (err: { statusCode?: number }) => {
        if (err.statusCode === 404 || err.statusCode === 410) await removeSub(sub.endpoint)
        else console.error('Notifikation fejlede', err)
      })))
  }
  catch (err) {
    console.error('Kunne ikke sende notifikationer', err)
  }
}
