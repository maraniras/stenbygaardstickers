import type { ActivityItem } from '../../shared/types/activity'
import { registerRefresh } from '../utils/refresh'
let started = false
let revision = 0

export function useActivity() {
  const { name } = useUser()
  const items = useState<ActivityItem[]>('activity-items', () => [])
  const loading = useState('activity-loading', () => false)
  const error = useState('activity-error', () => '')
  async function request(ids?: string[]) {
    const owner = name.value,
      token = userToken(),
      current = ++revision
    if (!owner || !token) return
    loading.value = true
    error.value = ''
    try {
      const response = await $fetch<{ items: ActivityItem[] }>('/api/me/activity', {
        method: ids ? 'POST' : 'GET',
        body: ids ? { ids } : undefined,
        headers: { 'x-user-token': token },
        timeout: 15000,
        retry: 0,
      })
      if (current === revision && owner === name.value && token === userToken())
        items.value = response.items
    } catch {
      if (current === revision && owner === name.value)
        error.value = 'Kunne ikke hente din aktivitet. Prøv igen.'
    } finally {
      if (current === revision) loading.value = false
    }
  }
  if (!started && import.meta.client) {
    started = true
    watch(
      name,
      () => {
        revision++
        items.value = []
        loading.value = false
        error.value = ''
        if (name.value) void request()
      },
      { immediate: true },
    )
    registerRefresh('activity', () => request(), 60000)
  }
  return {
    items,
    loading,
    error,
    unread: computed(() => items.value.filter((i) => !i.readAt).length),
    reload: () => request(),
    markRead: (ids: string[]) => request(ids),
  }
}
