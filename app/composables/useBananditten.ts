import type { SlotResponse } from '../../shared/types/slots'
import { registerRefresh } from '../utils/refresh'
import { useSlotPresentation } from './useSlotPresentation'
export function useBananditten() {
  const { name, ready } = useUser()
  const economy = useEconomy()
  const data = ref<SlotResponse | null>(null),
    shownBalance = ref<number | null>(null)
  const busy = ref(false),
    error = ref(''),
    bet = ref(5)
  const presentation = useSlotPresentation()
  const sound = useSlotSound()
  const animation = useState('slot-animation', () => false)
  const locked = computed(() => busy.value || presentation.rolling.value)
  const canSpin = computed(
    () =>
      !!name.value &&
      !!data.value &&
      !locked.value &&
      data.value.balance >= bet.value &&
      data.value.dailyLimit.remaining >= bet.value,
  )
  let resetTimer: ReturnType<typeof setTimeout> | undefined
  let revision = 0
  let alive = true
  async function accept(response: SlotResponse, animate = false) {
    if ((response.spin?.sequence ?? 0) < (data.value?.spin?.sequence ?? 0)) return
    data.value = response
    clearTimeout(resetTimer)
    resetTimer = setTimeout(
      () => void refresh(),
      Math.max(250, Date.parse(response.dailyLimit.nextResetAt) - Date.now() + 100),
    )
    const shown = await presentation.present(response.spin, animate)
    if (!shown) return
    shownBalance.value = response.balance
    if (animate && response.spin && response.spin.payout > response.spin.bet)
      void shootConfetti(response.spin.multiplier === 100 ? 'normal' : 'small')
  }
  async function refresh() {
    if (!alive || !name.value || !ready.value || locked.value) return
    const owner = revision,
      token = userToken()
    busy.value = true
    try {
      const response = await $fetch<SlotResponse>('/api/games/slots', {
        headers: { 'x-user-token': token },
        timeout: 20000,
        retry: 0,
      })
      if (owner === revision && token === userToken()) {
        await accept(response)
        error.value = ''
      }
    } catch (e: any) {
      if (owner === revision) error.value = e?.data?.statusMessage || 'Spillet kunne ikke hentes.'
    } finally {
      busy.value = false
      if (owner !== revision) queueMicrotask(refresh)
    }
  }
  async function spin() {
    if (!canSpin.value || !data.value) return
    const owner = revision,
      token = userToken(),
      before = data.value
    const body = {
      id: crypto.randomUUID(),
      previous: before.spin?.id ?? null,
      sequence: (before.spin?.sequence ?? 0) + 1,
      bet: bet.value,
    }
    busy.value = true
    error.value = ''
    animation.value = true
    shownBalance.value = before.balance - bet.value
    sound.start()
    try {
      const response = await $fetch<SlotResponse>('/api/games/slots', {
        method: 'POST',
        body,
        headers: { 'x-user-token': token },
        timeout: 25000,
        retry: 0,
      })
      if (owner !== revision || token !== userToken()) return
      sound.play(response.spin?.multiplier ?? 0)
      await accept(response, true)
      if (owner === revision && token === userToken()) {
        void economy.reload()
        void useUser().refreshMe()
      }
    } catch (e: any) {
      sound.stop()
      if (owner !== revision || token !== userToken()) return
      error.value =
        e?.data?.statusMessage ||
        'Forbindelsen blev afbrudt. Hent resultatet igen — et gemt spin bliver ikke spillet igen.'
      try {
        const response = await $fetch<SlotResponse>('/api/games/slots', {
          headers: { 'x-user-token': token },
          timeout: 20000,
          retry: 0,
        })
        if (owner === revision && token === userToken()) await accept(response)
      } catch {
        /* Preserve the last known result; never automatically retry a wager. */
      }
    } finally {
      busy.value = false
      if (owner === revision) animation.value = false
      if (owner !== revision) queueMicrotask(refresh)
    }
  }
  watch(
    [name, ready],
    () => {
      revision++
      sound.stop()
      presentation.reset()
      data.value = null
      shownBalance.value = null
      error.value = ''
      clearTimeout(resetTimer)
      void refresh()
    },
    { immediate: true },
  )
  let stop: (() => void) | undefined
  onMounted(() => {
    stop = registerRefresh('bananditten', refresh, 30000)
  })
  onBeforeUnmount(() => {
    alive = false
    revision++
    presentation.reset()
    clearTimeout(resetTimer)
    stop?.()
  })
  return {
    name,
    ready,
    data,
    shownBalance,
    busy,
    locked,
    error,
    bet,
    canSpin,
    soundEnabled: sound.enabled,
    toggleSound: sound.toggle,
    refresh,
    spin,
    ...presentation,
  }
}
