import { christmasDiscoveries } from '../utils/christmasDiscovery'

export function useChristmasDiscovery() {
  const { name, ready } = useUser()
  const route = useRoute()
  const seen = useState<string[]>('christmas-discovery-seen', () => [])
  const now = ref(new Date())
  const storageKey = computed(
    () =>
      `stenbygaard-christmas-seen:${encodeURIComponent(name.value?.toLocaleLowerCase('da') ?? 'guest')}`,
  )
  const items = computed(() => christmasDiscoveries(now.value))
  const hasNew = computed(
    () => ready.value && items.value.some((item) => !seen.value.includes(item.key)),
  )
  function read() {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(storageKey.value) ?? '[]')
      seen.value = Array.isArray(saved)
        ? saved.filter((key): key is string => typeof key === 'string')
        : []
    } catch {
      seen.value = []
    }
  }
  function visit() {
    if (!ready.value || route.query.preview === '1') return
    const visited = items.value.filter((item) => item.path === route.path).map((item) => item.key)
    if (!visited.some((key) => !seen.value.includes(key))) return
    seen.value = [...new Set([...seen.value, ...visited])]
    try {
      localStorage.setItem(storageKey.value, JSON.stringify(seen.value))
    } catch {}
  }
  watch(
    [storageKey, ready],
    () => {
      read()
      visit()
    },
    { immediate: true },
  )
  watch([() => route.fullPath, items], visit)
  let timer: ReturnType<typeof setInterval> | undefined
  onMounted(() => {
    timer = setInterval(() => {
      now.value = new Date()
    }, 30_000)
  })
  onBeforeUnmount(() => clearInterval(timer))
  return { hasNew }
}
