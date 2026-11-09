import type { BoxesRun } from '../../shared/types/boxes'

export function useDailyBoxes() {
  const { state, reload, openBoxes, error: walletError } = useEconomy()
  const { name, ready } = useUser()
  const active = computed(() => state.value?.boxesActive ?? false)
  const selected = ref<number[]>([]),
    run = ref<BoxesRun | null>(null)
  const busy = ref(false),
    flipped = ref(false),
    resultVisible = ref(false)
  const balance = ref<number | null>(null),
    error = ref('')
  const animation = useState('daily-game-animation', () => false)
  let revision = 0,
    alive = true,
    finish: (() => void) | undefined
  function sync() {
    if (busy.value) return
    run.value = state.value?.boxes ?? null
    selected.value = [...(run.value?.choices ?? [])]
    flipped.value = !!run.value
    resultVisible.value = !!run.value
    balance.value = state.value?.wallet.balance ?? null
  }
  function cancel() {
    revision++
    finish?.()
    finish = undefined
    busy.value = false
    animation.value = false
  }
  watch(
    [name, () => state.value?.day, active],
    () => {
      cancel()
      error.value = ''
      sync()
    },
    { immediate: true },
  )
  watch(state, sync)
  function toggle(index: number) {
    if (
      !name.value ||
      !state.value ||
      !active.value ||
      run.value ||
      busy.value ||
      !Number.isInteger(index) ||
      index < 0 ||
      index > 11
    )
      return
    selected.value = selected.value.includes(index)
      ? selected.value.filter((n) => n !== index)
      : selected.value.length < 3
        ? [...selected.value, index]
        : selected.value
  }
  async function play() {
    if (
      busy.value ||
      run.value ||
      !state.value ||
      !name.value ||
      !active.value ||
      selected.value.length !== 3
    )
      return
    const mine = revision,
      owner = name.value,
      token = userToken(),
      day = state.value.day
    const current = () =>
      alive && revision === mine && owner === name.value && token === userToken()
    busy.value = true
    animation.value = true
    error.value = ''
    try {
      const response = await openBoxes([...selected.value])
      if (!current() || response.day !== day || state.value?.day !== day || !response.boxes) return
      run.value = response.boxes
      selected.value = [...response.boxes.choices]
      await nextTick()
      if (!current()) return
      flipped.value = true
      await new Promise<void>((resolve) => {
        const timer = setTimeout(
          resolve,
          window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 850,
        )
        finish = () => {
          clearTimeout(timer)
          resolve()
        }
      })
      finish = undefined
      if (!current()) return
      resultVisible.value = true
      balance.value = state.value?.wallet.balance ?? response.wallet.balance
      if (response.boxes.amount > 0) void shootConfetti('small').catch(() => {})
    } catch (e: any) {
      if (current()) {
        busy.value = false
        animation.value = false
        error.value =
          e?.data?.statusMessage || 'Svaret kunne ikke hentes. Vi tjekker dine gemte bokse.'
        await reload()
        if (current() && state.value?.boxes) {
          sync()
          error.value = ''
        }
      }
    } finally {
      if (current()) {
        busy.value = false
        animation.value = false
      }
    }
  }
  onBeforeUnmount(() => {
    alive = false
    cancel()
  })
  return {
    active,
    state,
    name,
    ready,
    selected,
    run,
    busy,
    flipped,
    resultVisible,
    balance,
    error,
    walletError,
    reload,
    toggle,
    play,
  }
}
