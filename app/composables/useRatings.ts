// 👍 (1–5) pr. enhed: hver browser får et tilfældigt id i localStorage og tæller
// som én. Samme id bruges til 👍 på kommentarer, når man ikke er logget ind.

const KEY = 'stenbygaard-device'

export function deviceId() {
  try {
    let id = localStorage.getItem(KEY)
    if (!id) {
      id = typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join('')
      localStorage.setItem(KEY, id)
    }
    return id
  }
  catch {
    return ''
  }
}

let loading: Promise<void> | undefined

export function useRatings() {
  const ratings = useState<Record<string, RatingSummary>>('ratings', () => ({}))
  const enabled = useState('ratings-enabled', () => true)
  /** Første hentning er færdig (også hvis den fejlede) */
  const ready = useState('ratings-ready', () => false)
  const error = ref('')

  if (!loading) {
    loading = $fetch<Record<string, RatingSummary>>('/api/ratings', { query: { device: deviceId() } })
      .then((r) => { ratings.value = r })
      .catch(() => { enabled.value = false })
      .finally(() => { ready.value = true })
  }

  /** Samme antal igen fjerner ens vurdering */
  async function rate(stickerId: string, thumbs: number) {
    const device = deviceId()
    if (!device) return
    const prev = ratings.value[stickerId]
    const value = prev?.mine === thumbs ? 0 : thumbs
    // Vis med det samme, ret til når serveren svarer
    const sum = (prev?.avg ?? 0) * (prev?.count ?? 0) - (prev?.mine ?? 0) + value
    const count = (prev?.count ?? 0) - (prev?.mine ? 1 : 0) + (value ? 1 : 0)
    const next = { ...ratings.value }
    if (count) next[stickerId] = { avg: sum / count, count, ...(value ? { mine: value } : {}) }
    else delete next[stickerId]
    ratings.value = next
    error.value = ''
    try {
      ratings.value = await $fetch<Record<string, RatingSummary>>('/api/ratings', {
        method: 'POST',
        body: { stickerId, device, value },
        headers: { 'x-user-token': userToken() },
      })
    }
    catch (err: any) {
      error.value = err?.data?.statusMessage || 'Kunne ikke gemme'
      const back = { ...ratings.value }
      if (prev) back[stickerId] = prev
      else delete back[stickerId]
      ratings.value = back
    }
  }

  return { ratings, enabled, ready, error, rate }
}
