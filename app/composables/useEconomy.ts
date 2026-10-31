import { singleFlight } from '../utils/requests'
import { registerRefresh } from '../utils/refresh'
let started = false
let privateRequest: Promise<void> | undefined
let resetTimer: ReturnType<typeof setTimeout> | undefined

export function useEconomy() {
  const { name, ready } = useUser()
  const state = useState<DailyResponse | null>('economy-me', () => null)
  const people = useState<Record<string, EconomyPublic>>('economy-public', () => ({}))
  const error = useState('economy-error', () => '')
  const loading = useState('economy-loading', () => false)
  const { availability } = useDailyAvailability()

  function apply(response: DailyResponse) {
    state.value = response
    if (name.value)
      people.value = { ...people.value, [name.value.toLocaleLowerCase('da')]: response.wallet }
    availability.value = { city: !response.city.finished, wheel: !response.wheel }
    clearTimeout(resetTimer)
    const delay = Math.max(500, Date.parse(response.nextResetAt) - Date.now() + 250)
    resetTimer = setTimeout(
      () => {
        state.value = null
        availability.value = null
        reload()
      },
      Math.min(delay, 2147483647),
    )
  }
  async function reload() {
    if (!name.value || !ready.value) return
    if (privateRequest) return privateRequest
    const owner = name.value
    const token = userToken()
    loading.value = true
    privateRequest = (async () => {
      try {
        const r = await $fetch<DailyResponse>('/api/economy/me', {
          headers: { 'x-user-token': token },
          timeout: 20_000,
          retry: 0,
        })
        if (name.value === owner && userToken() === token) {
          apply(r)
          error.value = ''
        }
      } catch (e: any) {
        if (name.value === owner)
          error.value = e?.data?.statusMessage || 'Bananerne kunne ikke hentes. Prøv igen.'
      } finally {
        privateRequest = undefined
        loading.value = false
        if (name.value && ready.value && (name.value !== owner || userToken() !== token))
          queueMicrotask(reload)
      }
    })()
    return privateRequest
  }
  async function reloadPeople() {
    try {
      const response = await singleFlight('economy-public', () =>
        $fetch<Record<string, EconomyPublic>>('/api/economy/public', { timeout: 15000, retry: 0 }),
      )
      if (name.value && state.value)
        response[name.value.toLocaleLowerCase('da')] = state.value.wallet
      people.value = response
    } catch {
      /* Preserve known public balances; never invent zero for unknown accounts. */
    }
  }
  async function act(path: string, body: Record<string, string>) {
    const owner = name.value,
      token = userToken()
    if (!owner) throw new Error('Vælg dit navn for at spille')
    const response = await $fetch<DailyResponse>(path, {
      method: 'POST',
      body,
      headers: { 'x-user-token': token },
      timeout: 25_000,
      retry: 0,
    })
    if (owner === name.value && token === userToken()) {
      apply(response)
      error.value = ''
      useUser().refreshMe()
    }
    return response
  }
  if (import.meta.client && !started) {
    started = true
    watch(
      [name, ready],
      () => {
        state.value = null
        error.value = ''
        availability.value = null
        clearTimeout(resetTimer)
        if (name.value && ready.value) reload()
      },
      { immediate: true },
    )
    registerRefresh('economy', () => Promise.all([reload(), reloadPeople()]))
    reloadPeople()
  }
  return {
    state,
    people,
    error,
    loading,
    reload,
    reloadPeople,
    guess: (choice: string) =>
      act('/api/games/city/guess', { day: state.value?.day ?? '', choice }),
    spin: () => act('/api/games/wheel', { day: state.value?.day ?? '' }),
  }
}
