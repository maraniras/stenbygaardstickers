import { singleFlight } from '../utils/requests'
// Valgfri bruger: navnet er låst til enheden med en nøgle i localStorage
// (server/utils/users.ts). Uden nøgle er man bare anonym som hidtil.
const KEY = 'stenbygaard-user-token'
// Har man slået badge-beskeder fra på denne enhed, kobles push ikke på igen af sig selv
const PUSH_OFF_KEY = 'stenbygaard-badge-push-off'
// Hvilket navn enhedens 👍 sidst er flyttet over til
const CLAIMED_KEY = 'stenbygaard-ratings-claimed'

function seenCacheKey(owner: string) {
  return `stenbygaard-seen:${encodeURIComponent(owner.toLocaleLowerCase('da'))}`
}
function cachedSeen(owner: string): string[] {
  try {
    const value = JSON.parse(localStorage.getItem(seenCacheKey(owner)) ?? '[]')
    return Array.isArray(value) ? value.filter((key): key is string => typeof key === 'string') : []
  } catch {
    return []
  }
}
function rememberSeen(owner: string, keys: string[]) {
  const merged = [...new Set([...cachedSeen(owner), ...keys])]
  try {
    localStorage.setItem(seenCacheKey(owner), JSON.stringify(merged))
  } catch {}
  return merged
}

/** Enhedens nøgle – sendes som x-user-token, når serveren skal vide, hvem man er */
export function userToken() {
  try {
    return localStorage.getItem(KEY) ?? ''
  } catch {
    return ''
  }
}
const readToken = userToken

function writeToken(token: string | null) {
  try {
    if (token) localStorage.setItem(KEY, token)
    else localStorage.removeItem(KEY)
  } catch {}
}

function pushOff(value?: boolean) {
  try {
    if (value === undefined) return localStorage.getItem(PUSH_OFF_KEY) === '1'
    if (value) localStorage.setItem(PUSH_OFF_KEY, '1')
    else localStorage.removeItem(PUSH_OFF_KEY)
  } catch {}
  return false
}

const headers = () => ({ 'x-user-token': readToken() })

let loading: Promise<void> | undefined
let sessionRevision = 0

export function useUser() {
  const name = useState<string | null>('user-name', () => null)
  const ready = useState('user-ready', () => false)
  /** Badges man har set (earnedKeys) – null indtil det er hentet */
  const seen = useState<string[] | null>('user-seen', () => null)
  /** Får denne enhed beskeder til brugeren (badges, kommentarer …) */
  const badgePush = useState('user-badge-push', () => false)
  /** Hvilke typer man vil have (mangler = til) */
  const notify = useState<NotifyPrefs>('user-notify', () => ({}))

  async function loadMe() {
    const token = readToken(),
      revision = sessionRevision
    const current = () => token === readToken() && revision === sessionRevision
    const r = await singleFlight('me:' + token + ':' + revision, () =>
      $fetch<MeResponse>('/api/me', {
        headers: { 'x-user-token': token },
        timeout: 15000,
        retry: 0,
      }),
    )
    if (!current()) return
    const previousSeen = name.value === r.name ? (seen.value ?? []) : []
    name.value = r.name
    seen.value = r.name ? rememberSeen(r.name, [...(r.seen ?? []), ...previousSeen]) : null
    badgePush.value = Boolean(r.push)
    notify.value = r.notify ?? {}
    // Navnet er frigivet i admin: glem nøglen
    if (!r.name) return writeToken(null)
    const saved = new Set(r.seen ?? [])
    const pending = (seen.value ?? []).filter((key) => !saved.has(key))
    if (pending.length) void markSeen(pending)
    syncPush()
    // Én gang pr. enhed: enhedens 👍 flyttes over på brugeren (også for dem, der
    // loggede ind, før 👍 fulgte brugeren)
    try {
      if (localStorage.getItem(CLAIMED_KEY) !== r.name) {
        await singleFlight('claim-ratings:' + token, () => useRatings().claim())
        if (current()) localStorage.setItem(CLAIMED_KEY, r.name)
      }
    } catch {}
  }

  if (!loading && import.meta.client) {
    loading = (readToken() ? loadMe().catch(() => {}) : Promise.resolve()).finally(() => {
      ready.value = true
    })
  }

  async function signedIn(r: LoginResponse, revision: number) {
    if (revision !== sessionRevision) return
    writeToken(r.token)
    name.value = r.name
    useUsers().reload()
    // loadMe flytter også enhedens 👍 over på brugeren
    await loadMe().catch(() => {})
  }

  async function claim(input: string) {
    const revision = ++sessionRevision
    await signedIn(
      await $fetch<LoginResponse>('/api/me', {
        method: 'POST',
        body: { name: input },
        headers: headers(),
        timeout: 15000,
        retry: 0,
      }),
      revision,
    )
  }

  async function pair(code: string) {
    const revision = ++sessionRevision
    await signedIn(
      await $fetch<LoginResponse>('/api/me/pair', {
        method: 'POST',
        body: { code },
        timeout: 15000,
        retry: 0,
      }),
      revision,
    )
  }

  function createCode() {
    return $fetch<PairCode>('/api/me/code', { method: 'POST', headers: headers() })
  }

  async function logout() {
    const token = readToken()
    sessionRevision++
    writeToken(null)
    name.value = null
    seen.value = null
    badgePush.value = false
    notify.value = {}
    await $fetch('/api/me', {
      method: 'DELETE',
      headers: { 'x-user-token': token },
      timeout: 15000,
      retry: 0,
    }).catch(() => {})
    await Promise.all([useUsers().reload(), useRatings().reload()])
  }

  async function setAvatar(file: File) {
    const token = readToken(),
      revision = sessionRevision
    const url = await uploadAvatar(file)
    if (token !== readToken() || revision !== sessionRevision) return
    await $fetch('/api/me/avatar', {
      method: 'PUT',
      body: { url },
      headers: { 'x-user-token': token },
      timeout: 15000,
      retry: 0,
    })
    await useUsers().reload()
  }

  async function removeAvatar() {
    await $fetch('/api/me/avatar', { method: 'DELETE', headers: headers() })
    await useUsers().reload()
  }

  /** Har browseren allerede lov til notifikationer, kobles de på brugeren uden at spørge */
  async function syncPush() {
    if (!name.value || pushOff() || !pushSupported() || Notification.permission !== 'granted')
      return
    const token = readToken(),
      revision = sessionRevision
    try {
      const sub = await subscription()
      if (!sub || token !== readToken() || revision !== sessionRevision) return
      await $fetch('/api/me/push', {
        method: 'POST',
        body: sub.toJSON(),
        headers: { 'x-user-token': token },
        timeout: 15000,
        retry: 0,
      })
      if (token === readToken() && revision === sessionRevision) badgePush.value = true
    } catch {}
  }

  /** Slår badge-beskeder til/fra på denne enhed (til skal ske fra et tryk) */
  async function setBadgePush(on: boolean) {
    const token = readToken(),
      revision = sessionRevision
    const current = () => token === readToken() && revision === sessionRevision
    if (on) {
      const sub = await ensureSubscription()
      if (!current()) return
      await $fetch('/api/me/push', {
        method: 'POST',
        body: sub.toJSON(),
        headers: { 'x-user-token': token },
        timeout: 15000,
        retry: 0,
      })
    } else {
      await $fetch('/api/me/push', {
        method: 'DELETE',
        headers: { 'x-user-token': token },
        timeout: 15000,
        retry: 0,
      })
    }
    if (current()) {
      pushOff(!on)
      badgePush.value = on
    }
  }

  /** Slår en type notifikationer til/fra for brugeren (alle enheder) */
  async function setNotify(type: NotifyType, on: boolean) {
    const token = readToken(),
      revision = sessionRevision
    const prev = notify.value
    notify.value = { ...prev, [type]: on }
    try {
      const response = await $fetch<NotifyPrefs>('/api/me/notify', {
        method: 'PUT',
        body: { [type]: on },
        headers: { 'x-user-token': token },
        timeout: 15000,
        retry: 0,
      })
      if (token === readToken() && revision === sessionRevision) notify.value = response
    } catch (err) {
      if (token === readToken() && revision === sessionRevision) notify.value = prev
      throw err
    }
  }

  /** Markerer badges som set, så pop-up'en ikke viser dem */
  async function markSeen(keys: string[]) {
    if (!name.value || !keys.length) return
    const token = readToken(),
      revision = sessionRevision,
      owner = name.value
    seen.value = rememberSeen(owner, [...(seen.value ?? []), ...keys])
    try {
      for (let offset = 0; offset < keys.length; offset += 300) {
        if (token !== readToken() || revision !== sessionRevision) return
        const r = await $fetch<{ seen: string[] }>('/api/me/seen', {
          method: 'POST',
          body: { keys: keys.slice(offset, offset + 300) },
          headers: { 'x-user-token': token },
          timeout: 15000,
          retry: 0,
        })
        if (token === readToken() && revision === sessionRevision)
          seen.value = rememberSeen(owner, [...(seen.value ?? []), ...r.seen])
      }
    } catch {}
  }

  /** Er det her mig? */
  const isMe = (other: string) => Boolean(name.value && sameName(name.value, other))

  return {
    name,
    ready,
    seen,
    badgePush,
    notify,
    claim,
    pair,
    createCode,
    logout,
    setAvatar,
    removeAvatar,
    syncPush,
    setBadgePush,
    setNotify,
    markSeen,
    isMe,
    refreshMe: () => loadMe().catch(() => {}),
  }
}
