import type { AdventResponse } from '../../shared/types/advent'
import { registerRefresh } from '../utils/refresh'

export function useAdventRewards() {
  const user = useUser()
  const { name, ready } = user
  const economy = useEconomy()
  const state = ref<AdventResponse | null>(null)
  const loading = ref(false),
    claiming = ref(false),
    error = ref('')
  const testMode = ref(false)
  const previewAllowed = computed(() => state.value?.previewAllowed === true)
  let ownerRevision = 0,
    alive = true,
    initialized = false
  let timer: ReturnType<typeof setTimeout> | undefined
  let stop: (() => void) | undefined
  function apply(response: AdventResponse) {
    state.value = response
    if (!initialized) {
      testMode.value = response.previewAllowed
      initialized = true
    }
    if (!response.previewAllowed) testMode.value = false
    clearTimeout(timer)
    timer = setTimeout(
      () => void refresh(),
      Math.min(2147483647, Math.max(500, Date.parse(response.nextRefreshAt) - Date.now() + 100)),
    )
  }
  async function refresh() {
    if (!alive || !ready.value || loading.value || claiming.value) return
    const revision = ownerRevision,
      token = userToken()
    loading.value = true
    try {
      const response = await $fetch<AdventResponse>('/api/games/advent', {
        headers: { 'x-user-token': token },
        retry: 0,
        timeout: 20000,
      })
      if (alive && revision === ownerRevision && token === userToken()) {
        apply(response)
        error.value = ''
      }
    } catch (e: any) {
      if (alive && revision === ownerRevision)
        error.value = e?.data?.statusMessage || 'Kalenderen kunne ikke hentes.'
    } finally {
      loading.value = false
      if (alive && revision !== ownerRevision) queueMicrotask(refresh)
    }
  }
  async function claim(day: number) {
    if (!state.value || !name.value || claiming.value || testMode.value) return false
    const revision = ownerRevision,
      token = userToken()
    claiming.value = true
    error.value = ''
    try {
      const response = await $fetch<AdventResponse>('/api/games/advent', {
        method: 'POST',
        body: { year: state.value.year, day },
        headers: { 'x-user-token': token },
        retry: 0,
        timeout: 25000,
      })
      if (!alive || revision !== ownerRevision || token !== userToken()) return false
      apply(response)
      return true
    } catch (e: any) {
      if (alive && revision === ownerRevision)
        error.value =
          e?.data?.statusMessage ||
          'Lågen kunne ikke åbnes. Hent kalenderen igen; en gemt præmie gives ikke to gange.'
      return false
    } finally {
      claiming.value = false
      if (alive && revision !== ownerRevision) queueMicrotask(refresh)
    }
  }
  watch(
    [name, ready],
    () => {
      ownerRevision++
      state.value = null
      error.value = ''
      clearTimeout(timer)
      void refresh()
    },
    { immediate: true },
  )
  onMounted(() => {
    stop = registerRefresh('advent-calendar', refresh, 30000)
  })
  onBeforeUnmount(() => {
    alive = false
    ownerRevision++
    clearTimeout(timer)
    stop?.()
  })
  return {
    state,
    name,
    loading,
    claiming,
    error,
    testMode,
    previewAllowed,
    refresh,
    claim,
    refreshBalance: () => {
      void economy.reload()
      void user.refreshMe()
    },
  }
}
