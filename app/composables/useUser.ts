// Valgfri bruger: navnet er låst til enheden med en nøgle i localStorage
// (server/utils/users.ts). Uden nøgle er man bare anonym som hidtil.
const KEY = 'stenbygaard-user-token'
// Har man slået badge-beskeder fra på denne enhed, kobles push ikke på igen af sig selv
const PUSH_OFF_KEY = 'stenbygaard-badge-push-off'

function readToken() {
  try { return localStorage.getItem(KEY) ?? '' }
  catch { return '' }
}

function writeToken(token: string | null) {
  try {
    if (token) localStorage.setItem(KEY, token)
    else localStorage.removeItem(KEY)
  }
  catch {}
}

function pushOff(value?: boolean) {
  try {
    if (value === undefined) return localStorage.getItem(PUSH_OFF_KEY) === '1'
    if (value) localStorage.setItem(PUSH_OFF_KEY, '1')
    else localStorage.removeItem(PUSH_OFF_KEY)
  }
  catch {}
  return false
}

const headers = () => ({ 'x-user-token': readToken() })

let loading: Promise<void> | undefined

export function useUser() {
  const name = useState<string | null>('user-name', () => null)
  const ready = useState('user-ready', () => false)
  /** Badges man har set (earnedKeys) – null indtil det er hentet */
  const seen = useState<string[] | null>('user-seen', () => null)
  /** Får denne enhed besked om nye badges */
  const badgePush = useState('user-badge-push', () => false)

  async function loadMe() {
    const r = await $fetch<MeResponse>('/api/me', { headers: headers() })
    name.value = r.name
    seen.value = r.seen ?? null
    badgePush.value = Boolean(r.push)
    // Navnet er frigivet i admin: glem nøglen
    if (!r.name) writeToken(null)
    else syncPush()
  }

  if (!loading && import.meta.client) {
    loading = (readToken() ? loadMe().catch(() => {}) : Promise.resolve())
      .finally(() => { ready.value = true })
  }

  async function signedIn(r: LoginResponse) {
    writeToken(r.token)
    name.value = r.name
    useUsers().reload()
    await loadMe().catch(() => {})
  }

  async function claim(input: string) {
    await signedIn(await $fetch<LoginResponse>('/api/me', { method: 'POST', body: { name: input }, headers: headers() }))
  }

  async function pair(code: string) {
    await signedIn(await $fetch<LoginResponse>('/api/me/pair', { method: 'POST', body: { code } }))
  }

  function createCode() {
    return $fetch<PairCode>('/api/me/code', { method: 'POST', headers: headers() })
  }

  async function logout() {
    await $fetch('/api/me', { method: 'DELETE', headers: headers() }).catch(() => {})
    writeToken(null)
    name.value = null
    seen.value = null
    badgePush.value = false
    await useUsers().reload()
  }

  async function setAvatar(file: File) {
    const url = await uploadAvatar(file)
    await $fetch('/api/me/avatar', { method: 'PUT', body: { url }, headers: headers() })
    await useUsers().reload()
  }

  async function removeAvatar() {
    await $fetch('/api/me/avatar', { method: 'DELETE', headers: headers() })
    await useUsers().reload()
  }

  /** Har browseren allerede lov til notifikationer, kobles de på brugeren uden at spørge */
  async function syncPush() {
    if (!name.value || pushOff() || !pushSupported() || Notification.permission !== 'granted') return
    try {
      const sub = await subscription()
      if (!sub) return
      await $fetch('/api/me/push', { method: 'POST', body: sub.toJSON(), headers: headers() })
      badgePush.value = true
    }
    catch {}
  }

  /** Slår badge-beskeder til/fra på denne enhed (til skal ske fra et tryk) */
  async function setBadgePush(on: boolean) {
    if (on) {
      const sub = await ensureSubscription()
      await $fetch('/api/me/push', { method: 'POST', body: sub.toJSON(), headers: headers() })
    }
    else {
      await $fetch('/api/me/push', { method: 'DELETE', headers: headers() })
    }
    pushOff(!on)
    badgePush.value = on
  }

  /** Markerer badges som set, så pop-up'en ikke viser dem */
  async function markSeen(keys: string[]) {
    if (!name.value || !keys.length) return
    seen.value = [...new Set([...(seen.value ?? []), ...keys])]
    try {
      const r = await $fetch<{ seen: string[] }>('/api/me/seen', { method: 'POST', body: { keys }, headers: headers() })
      seen.value = r.seen
    }
    catch {}
  }

  /** Er det her mig? */
  const isMe = (other: string) => Boolean(name.value && sameName(name.value, other))

  return { name, ready, seen, badgePush, claim, pair, createCode, logout, setAvatar, removeAvatar, syncPush, setBadgePush, markSeen, isMe }
}
