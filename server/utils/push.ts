// Notifikationer (Web Push) til to lister: "admin" (nye indsendte stickers – slås til
// på /admin) og "all" (alle der har sagt ja til besked om nye godkendte stickers).
// VAPID-nøgleparret laves automatisk første gang og gemmes i databasen, så der ikke
// skal sættes noget op på Vercel.
// Redis: "push:vapid" (JSON med nøglerne), hashen "push:subs" (admins) og "push:all"
// (alle), begge med endpoint → abonnement.
import webpush, { type PushSubscription } from 'web-push'

export type PushList = 'admin' | 'all'
const REDIS_KEY: Record<PushList, string> = { admin: 'push:subs', all: 'push:all' }
const LOCAL_KEY: Record<PushList, string> = { admin: 'push-subs', all: 'push-all' }

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

type LocalSubs = Record<string, PushSubscription>

async function allSubs(list: PushList): Promise<PushSubscription[]> {
  if (!redisEnabled) return Object.values((await useStorage('data').getItem<LocalSubs>(LOCAL_KEY[list])) ?? {})
  const [flat] = await redis([['HVALS', REDIS_KEY[list]]]) as [string[]]
  return flat.map(s => JSON.parse(s))
}

export async function addSub(list: PushList, sub: PushSubscription) {
  if (!redisEnabled) {
    const storage = useStorage('data')
    const subs = (await storage.getItem<LocalSubs>(LOCAL_KEY[list])) ?? {}
    subs[sub.endpoint] = sub
    await storage.setItem(LOCAL_KEY[list], subs)
    return
  }
  await redis([['HSET', REDIS_KEY[list], sub.endpoint, JSON.stringify(sub)]])
}

export async function removeSub(list: PushList, endpoint: string) {
  if (!redisEnabled) {
    const storage = useStorage('data')
    const subs = (await storage.getItem<LocalSubs>(LOCAL_KEY[list])) ?? {}
    delete subs[endpoint]
    await storage.setItem(LOCAL_KEY[list], subs)
    return
  }
  await redis([['HDEL', REDIS_KEY[list], endpoint]])
}

export async function hasSub(list: PushList, endpoint: string) {
  return (await allSubs(list)).some(s => s.endpoint === endpoint)
}

export function cleanSub(body: unknown): PushSubscription {
  const b = (body ?? {}) as { endpoint?: unknown, keys?: { p256dh?: unknown, auth?: unknown } }
  if (typeof b.endpoint !== 'string' || !b.endpoint.startsWith('https://') || b.endpoint.length > 1000
    || typeof b.keys?.p256dh !== 'string' || typeof b.keys?.auth !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'Ugyldigt abonnement' })
  }
  return { endpoint: b.endpoint, keys: { p256dh: b.keys.p256dh, auth: b.keys.auth } }
}

/** Sender til en liste. Abonnementer, som telefonen har opgivet, fjernes. */
export async function notify(list: PushList, message: { title: string, body: string, url: string }) {
  try {
    const subs = await allSubs(list)
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
        if (err.statusCode === 404 || err.statusCode === 410) await removeSub(list, sub.endpoint)
        else console.error('Notifikation fejlede', err)
      })))
  }
  catch (err) {
    console.error('Kunne ikke sende notifikationer', err)
  }
}

/** "Nicole og Mathias", "A, B og C" */
export function formatList(names: string[]) {
  if (names.length <= 1) return names[0] ?? ''
  return `${names.slice(0, -1).join(', ')} og ${names[names.length - 1]}`
}
