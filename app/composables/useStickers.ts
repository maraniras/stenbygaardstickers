import { singleFlight } from '../utils/requests'
import { registerRefresh } from '../utils/refresh'
// Godkendte stickers fra serveren. app.vue venter på første hentning, så siderne
// kan regne med, at listen er der. Bagefter hentes de igen, når appen kommer i
// forgrunden (fx åbnet fra hjemmeskærmen) og hvert minut mens den er synlig –
// listen udskiftes kun, hvis noget faktisk er ændret, så kortet ikke hopper.
const REFRESH_MS = 60_000

let loading: Promise<void> | undefined
let lastJson = ''

export function useStickers() {
  const raw = useState<StickerData[] | null>('stickers', () => null)
  const failed = useState('stickers-failed', () => false)

  function reload() {
    loading = singleFlight('stickers', () =>
      $fetch<StickerData[]>('/api/stickers', { timeout: 15000, retry: 0 }),
    )
      .then((r) => {
        const json = JSON.stringify(r)
        if (json !== lastJson) {
          lastJson = json
          raw.value = r
        }
        failed.value = false
      })
      .catch(() => {
        failed.value = true
      })
    return loading
  }

  if (!loading) {
    reload()
    if (import.meta.client) {
      registerRefresh('stickers', reload, REFRESH_MS)
    }
  }

  const stickers = computed(() => withDistance(raw.value ?? []))
  const people = computed(() => countPeople(stickers.value))
  const stats = computed(() => statsFor(stickers.value))

  return {
    stickers,
    people,
    stats,
    ready: computed(() => raw.value !== null),
    failed,
    reload,
    getSticker: (id: string) => stickers.value.find((s) => s.id === id),
    stickersBy: (name: string) =>
      stickers.value.filter((s) => s.placedBy.some((n) => sameName(n, name))),
  }
}
