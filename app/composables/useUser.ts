// Valgfri bruger: navnet er låst til enheden med en nøgle i localStorage
// (server/utils/users.ts). Uden nøgle er man bare anonym som hidtil.
const KEY = 'stenbygaard-user-token'

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

const headers = () => ({ 'x-user-token': readToken() })

let loading: Promise<void> | undefined

export function useUser() {
  const name = useState<string | null>('user-name', () => null)
  const ready = useState('user-ready', () => false)

  if (!loading && import.meta.client) {
    loading = readToken()
      ? $fetch<MeResponse>('/api/me', { headers: headers() })
          .then((r) => {
            name.value = r.name
            // Navnet er frigivet i admin: glem nøglen
            if (!r.name) writeToken(null)
          })
          .catch(() => {})
          .finally(() => { ready.value = true })
      : Promise.resolve().then(() => { ready.value = true })
  }

  function signedIn(r: LoginResponse) {
    writeToken(r.token)
    name.value = r.name
  }

  async function claim(input: string) {
    signedIn(await $fetch<LoginResponse>('/api/me', { method: 'POST', body: { name: input }, headers: headers() }))
  }

  async function pair(code: string) {
    signedIn(await $fetch<LoginResponse>('/api/me/pair', { method: 'POST', body: { code } }))
  }

  function createCode() {
    return $fetch<PairCode>('/api/me/code', { method: 'POST', headers: headers() })
  }

  async function logout() {
    await $fetch('/api/me', { method: 'DELETE', headers: headers() }).catch(() => {})
    writeToken(null)
    name.value = null
  }

  /** Er det her mig? */
  const isMe = (other: string) => Boolean(name.value && sameName(name.value, other))

  return { name, ready, claim, pair, createCode, logout, isMe }
}
