import { CHANGELOG } from '../utils/changelog'
import { latestPublishedRelease, releaseRank } from '../../shared/utils/releases'
const KEY = 'stenbygaard-release-seen'
export function useReleaseNews() {
  const seen = useState('release-news-seen', () => '')
  const ready = useState('release-news-ready', () => false)
  const open = useState('release-news-open', () => false)
  const blocking = useState('release-news-pending', () => false)
  const release = computed(() => latestPublishedRelease(CHANGELOG))
  const pending = computed(
    () =>
      ready.value &&
      !!release.value &&
      releaseRank(release.value.version) > releaseRank(seen.value),
  )
  function sync() {
    try {
      const stored = localStorage.getItem(KEY) ?? ''
      if (releaseRank(stored) > releaseRank(seen.value)) seen.value = stored
    } catch {}
    ready.value = true
  }
  function dismiss() {
    if (!release.value) return
    seen.value =
      releaseRank(seen.value) > releaseRank(release.value.version)
        ? seen.value
        : release.value.version
    try {
      localStorage.setItem(KEY, seen.value)
    } catch {}
    open.value = false
  }
  const changed = (event: StorageEvent) => {
    if (event.key === KEY || event.key === null) sync()
  }
  watch(
    pending,
    (value) => {
      blocking.value = value
      if (!value) open.value = false
    },
    { immediate: true },
  )
  onMounted(() => {
    sync()
    window.addEventListener('storage', changed)
  })
  onBeforeUnmount(() => {
    window.removeEventListener('storage', changed)
    open.value = false
    blocking.value = false
  })
  return { release, pending, open, dismiss }
}
