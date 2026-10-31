// Web Push i browseren. "admin" = besked om nye indsendte stickers (/admin),
// "all" = besked om nye godkendte stickers (pop-up første gang + klokken på listen).
// Begge bruger samme service worker (public/sw.js), men hvert sit abonnement på serveren.
type List = 'admin' | 'all'

function keyBytes(base64: string) {
  const b64 = (base64 + '='.repeat((4 - (base64.length % 4)) % 4))
    .replace(/-/g, '+')
    .replace(/_/g, '/')
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
}

export function pushSupported() {
  return (
    import.meta.client &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

/** iPhone/iPad i Safari uden at være føjet til hjemmeskærmen – der kan Apple ikke sende besked */
export function needsHomeScreen() {
  if (!import.meta.client) return false
  const ios =
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as any).standalone === true
  return ios && !standalone
}

export async function subscription() {
  const reg = await navigator.serviceWorker.getRegistration('/')
  return reg?.pushManager.getSubscription()
}

/** Spørger om lov (skal ske fra et tryk) og giver browserens push-abonnement */
export async function ensureSubscription() {
  const permission = await Notification.requestPermission()
  if (permission !== 'granted')
    throw new Error('Notifikationer er blokeret. Slå dem til for appen i telefonens indstillinger.')
  const { publicKey } = await $fetch<{ publicKey: string }>('/api/push')
  const reg =
    (await navigator.serviceWorker.getRegistration('/')) ??
    (await navigator.serviceWorker.register('/sw.js', { scope: '/' }))
  await navigator.serviceWorker.ready
  return (
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: keyBytes(publicKey),
    }))
  )
}

export function usePush(list: List) {
  const api = list === 'admin' ? '/api/admin/push' : '/api/push'
  const on = useState(`push-on-${list}`, () => false)
  const busy = ref(false)

  async function refresh() {
    if (!pushSupported()) return
    const sub = await subscription()
    if (!sub) {
      on.value = false
      return
    }
    const r = await $fetch<{ subscribed: boolean }>(api, {
      query: { endpoint: sub.endpoint },
    }).catch(() => undefined)
    on.value = Boolean(r?.subscribed)
  }

  /** Spørger om lov (skal ske fra et tryk) og melder telefonen til */
  async function enable() {
    const sub = await ensureSubscription()
    await $fetch(api, { method: 'POST', body: sub.toJSON() })
    on.value = true
    // Er man logget ind, får man også besked om sine badges på denne enhed
    if (list === 'all') useUser().syncPush()
  }

  /** Melder telefonen fra denne liste. Abonnementet i browseren beholdes, hvis den anden liste bruger det. */
  async function disable() {
    const sub = await subscription()
    if (sub) await $fetch(api, { method: 'DELETE', body: { endpoint: sub.endpoint } })
    on.value = false
  }

  async function run(fn: () => Promise<void>) {
    busy.value = true
    try {
      await fn()
    } finally {
      busy.value = false
    }
  }

  return { on, busy, refresh, enable: () => run(enable), disable: () => run(disable) }
}
