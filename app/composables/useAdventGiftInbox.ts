import type { AdventGiftReceipt } from '../../shared/types/advent'
import { registerRefresh } from '../utils/refresh'

export function useAdventGiftInbox() {
  const { name, ready } = useUser()
  const gifts = ref<AdventGiftReceipt[]>([])
  const pending = useState('advent-gift-pending', () => false)
  let revision = 0,
    alive = true,
    loading = false
  let stop: (() => void) | undefined
  const cacheKey = (owner: string) =>
    `stenbygaard-gifts-seen:${encodeURIComponent(owner.toLocaleLowerCase('da'))}`
  function seen(owner: string): string[] {
    try {
      const value = JSON.parse(localStorage.getItem(cacheKey(owner)) ?? '[]')
      return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : []
    } catch {
      return []
    }
  }
  async function acknowledge(ids: string[], token: string) {
    if (!ids.length) return
    await $fetch('/api/me/gifts/seen', {
      method: 'POST',
      body: { ids },
      headers: { 'x-user-token': token },
      retry: 0,
      timeout: 15000,
    })
  }
  async function refresh() {
    if (!alive || !ready.value || !name.value || loading) return
    const owner = name.value,
      token = userToken(),
      version = revision
    loading = true
    try {
      const response = await $fetch<AdventGiftReceipt[]>('/api/me/gifts', {
        headers: { 'x-user-token': token },
        retry: 0,
        timeout: 15000,
      })
      if (!alive || version !== revision || token !== userToken()) return
      const closed = new Set(seen(owner))
      gifts.value = response.filter((g) => !closed.has(g.id))
      // Retry acknowledgements after a network failure, without redisplaying locally.
      const retryIds = response.filter((g) => closed.has(g.id)).map((g) => g.id)
      if (retryIds.length) await acknowledge(retryIds, token).catch(() => {})
    } catch {
      /* Durable receipts remain on the server until the next refresh. */
    } finally {
      loading = false
      if (alive && version !== revision) queueMicrotask(refresh)
    }
  }
  function dismiss() {
    if (!name.value || !gifts.value.length) return
    const ids = gifts.value.map((g) => g.id),
      owner = name.value,
      token = userToken()
    try {
      localStorage.setItem(cacheKey(owner), JSON.stringify([...new Set([...seen(owner), ...ids])]))
    } catch {}
    gifts.value = []
    void acknowledge(ids, token).catch(() => {})
  }
  watch(
    [name, ready],
    () => {
      revision++
      gifts.value = []
      void refresh()
    },
    { immediate: true },
  )
  watch(
    gifts,
    (value) => {
      pending.value = value.length > 0
    },
    { immediate: true },
  )
  onMounted(() => {
    stop = registerRefresh('advent-gifts', refresh, 30000)
  })
  onBeforeUnmount(() => {
    alive = false
    revision++
    stop?.()
    pending.value = false
  })
  return { gifts, refresh, dismiss }
}
