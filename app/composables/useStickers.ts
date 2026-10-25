// Godkendte stickers fra serveren. Hentes én gang; app.vue venter på dem, så
// siderne kan regne med, at listen er der.
let loading: Promise<void> | undefined

export function useStickers() {
  const raw = useState<StickerData[] | null>('stickers', () => null)
  const failed = useState('stickers-failed', () => false)

  function reload() {
    loading = $fetch<StickerData[]>('/api/stickers')
      .then((r) => {
        raw.value = r
        failed.value = false
      })
      .catch(() => { failed.value = true })
    return loading
  }
  if (!loading) reload()

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
    getSticker: (id: string) => stickers.value.find(s => s.id === id),
    stickersBy: (name: string) => stickers.value.filter(s => s.placedBy.some(n => sameName(n, name))),
  }
}
