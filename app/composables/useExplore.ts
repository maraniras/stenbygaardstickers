/** Keep the two sticker views in sync without changing existing shared URLs. */
export function useExplore() {
  const route = useRoute()
  const saved = useState<{ path: '/' | '/liste'; by: string; country: string }>(
    'explore-navigation',
    () => {
      try {
        const value = JSON.parse(localStorage.getItem('stenbygaard-explore') || 'null')
        return {
          path: value?.path === '/liste' ? '/liste' : '/',
          by: typeof value?.by === 'string' ? value.by : '',
          country: typeof value?.country === 'string' ? value.country : '',
        }
      } catch {
        return { path: '/', by: '', country: '' }
      }
    },
  )
  watch(
    () => [route.path, route.query.by, route.query.country] as const,
    ([path, by, country]) => {
      if (path !== '/' && path !== '/liste') return
      saved.value = {
        path,
        by: typeof by === 'string' ? by : '',
        country: typeof country === 'string' ? country : '',
      }
      try {
        localStorage.setItem('stenbygaard-explore', JSON.stringify(saved.value))
      } catch {
        // Navigation still works when browser storage is unavailable.
      }
    },
    { immediate: true },
  )
  const target = (path: '/' | '/liste') => ({
    path,
    query: {
      ...(saved.value.by ? { by: saved.value.by } : {}),
      ...(saved.value.country ? { country: saved.value.country } : {}),
    },
  })
  return { saved, target, entry: computed(() => target(saved.value.path)) }
}
