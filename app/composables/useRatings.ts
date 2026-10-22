// Stjerner pr. enhed: hver browser får et tilfældigt id i localStorage og
// tæller som én bruger.
export interface RatingSummary {
  avg: number
  count: number
  mine?: number
}

const KEY = 'stenbygaard-device'

function deviceId() {
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

  if (!loading) {
    loading = $fetch<Record<string, RatingSummary>>('/api/ratings', { query: { device: deviceId() } })
      .then((r) => { ratings.value = r })
      .catch(() => { enabled.value = false })
  }

  async function rate(stickerId: string, stars: number) {
    const device = deviceId()
    if (!device) return
    const prev = ratings.value[stickerId]
    // Vis med det samme, ret til når serveren svarer
    const values = (prev?.avg ?? 0) * (prev?.count ?? 0) - (prev?.mine ?? 0) + stars
    const count = (prev?.count ?? 0) + (prev?.mine ? 0 : 1)
    ratings.value = { ...ratings.value, [stickerId]: { avg: values / count, count, mine: stars } }
    try {
      ratings.value = await $fetch('/api/ratings', { method: 'POST', body: { stickerId, device, stars } })
    }
    catch {
      ratings.value = { ...ratings.value, [stickerId]: prev ?? { avg: 0, count: 0 } }
    }
  }

  return { ratings, enabled, rate }
}
