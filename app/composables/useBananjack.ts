import { registerRefresh } from '../utils/refresh'
import type { JackResponse, JackAction } from '../../shared/types/bananjack'
import { JACK_BETS, jackScore } from '../../shared/utils/bananjack'

export function useBananjack() {
  const { name, ready } = useUser()
  const economy = useEconomy()
  const data = ref<JackResponse | null>(null)
  const shownBalance = ref<number | null>(null)
  const busy = ref(false),
    loading = ref(false),
    error = ref(''),
    bet = ref(10)
  const rules = ref<HTMLDialogElement>()
  const dailyLimit = computed(() => data.value?.dailyLimit)
  const limitReached = computed(() =>
    Boolean(dailyLimit.value && dailyLimit.value.remaining < JACK_BETS[0]),
  )
  const canBet = (amount: number) =>
    Boolean(
      data.value &&
      data.value.balance >= amount &&
      (!dailyLimit.value || dailyLimit.value.remaining >= amount),
    )
  const resetTime = computed(() =>
    dailyLimit.value
      ? new Date(dailyLimit.value.nextResetAt).toLocaleString('da-DK', {
          timeZone: 'Europe/Copenhagen',
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '',
  )
  let limitTimer: ReturnType<typeof setTimeout> | undefined
  const { shown: game, animating, caption, present, reset } = useJackPresentation()
  const locked = computed(() => busy.value || loading.value || animating.value)
  const playing = computed(() => game.value?.status === 'playing')
  const completed = computed(
    () => game.value?.status === 'finished' && !busy.value && !animating.value,
  )
  const net = computed(() => (game.value?.payout ?? 0) - (game.value?.staked ?? 0))
  const outcome = computed(() => (net.value > 0 ? 'win' : net.value < 0 ? 'lose' : 'push'))
  const dealerValue = computed(() => {
    const cards = game.value?.dealer ?? []
    const visible = cards.filter((card): card is number => card !== null)
    if (!visible.length) return '—'
    return `${jackScore(visible).total}${cards.includes(null) ? ' + ?' : ''}`
  })
  const resultText = computed(() =>
    !game.value
      ? 'Klar til en hånd?'
      : playing.value
        ? `Din tur${game.value.hands.length > 1 ? ` · hånd ${game.value.active + 1} af ${game.value.hands.length}` : ''}`
        : game.value.hands[0]?.result === 'blackjack'
          ? 'Bananjack!'
          : net.value > 0
            ? 'Bananer i hus!'
            : net.value === 0
              ? 'Lige op'
              : 'Dealeren vandt.',
  )
  const labels = { blackjack: 'Bananjack!', win: 'Vundet', lose: 'Tabt', push: 'Lige op' }
  async function accept(response: JackResponse, animate = false) {
    const old = data.value?.game,
      next = response.game
    if (
      old &&
      next &&
      (next.sequence < old.sequence ||
        (next.sequence === old.sequence && next.revision < old.revision))
    )
      return
    const changed =
      !old ||
      !next ||
      next.sequence !== old.sequence ||
      next.id !== old.id ||
      next.revision !== old.revision
    data.value = response
    clearTimeout(limitTimer)
    if (response.dailyLimit)
      limitTimer = setTimeout(
        () => {
          void refresh()
        },
        Math.max(250, Date.parse(response.dailyLimit.nextResetAt) - Date.now() + 100),
      )
    if (!animate || !changed) shownBalance.value = response.balance
    if (!changed && game.value) {
      game.value = next
      return
    }
    const finished = await present(next, animate)
    if (finished) shownBalance.value = response.balance
    if (finished && animate && next?.status === 'finished' && next.payout > next.staked)
      void shootConfetti(next.hands[0]?.result === 'blackjack' ? 'normal' : 'small')
  }
  async function refresh() {
    if (!name.value || !ready.value || locked.value) return
    const owner = name.value,
      token = userToken()
    loading.value = true
    try {
      const response = await $fetch<JackResponse>('/api/games/bananjack', {
        headers: { 'x-user-token': token },
        retry: 0,
        timeout: 20000,
      })
      if (owner === name.value && token === userToken()) {
        accept(response)
        error.value = ''
      }
    } catch (e: any) {
      if (owner === name.value)
        error.value = e?.data?.statusMessage || 'Hånden kunne ikke hentes. Prøv igen.'
    } finally {
      loading.value = false
      if (name.value && (owner !== name.value || token !== userToken())) queueMicrotask(refresh)
    }
  }
  async function play(action: JackAction | 'deal') {
    if (locked.value || !name.value || !data.value) return
    busy.value = true
    error.value = ''
    const owner = name.value,
      token = userToken()
    const authoritative = data.value.game
    const body =
      action === 'deal'
        ? { action, id: crypto.randomUUID(), previous: authoritative?.id ?? null, bet: bet.value }
        : { action, id: authoritative!.id, revision: authoritative!.revision }
    try {
      const response = await $fetch<JackResponse>('/api/games/bananjack', {
        method: 'POST',
        body,
        headers: { 'x-user-token': token },
        retry: 0,
        timeout: 25000,
      })
      if (owner === name.value && token === userToken()) {
        await accept(response, true)
        void economy.reload()
        void useUser().refreshMe()
      }
    } catch (e: any) {
      if (owner === name.value && token === userToken()) {
        error.value =
          e?.data?.statusMessage ||
          'Forbindelsen blev afbrudt. Hent hånden igen — din indsats er gemt, hvis den nåede frem.'
        // Reconcile a possibly committed request; never retry a wager automatically.
        try {
          const response = await $fetch<JackResponse>('/api/games/bananjack', {
            headers: { 'x-user-token': token },
            retry: 0,
            timeout: 20000,
          })
          if (owner === name.value && token === userToken()) accept(response)
        } catch {
          /* Keep known hand and offer a read-only retry. */
        }
      }
    } finally {
      busy.value = false
      if (name.value && (owner !== name.value || token !== userToken())) queueMicrotask(refresh)
    }
  }
  watch(
    [name, ready],
    () => {
      reset()
      data.value = null
      shownBalance.value = null
      error.value = ''
      void refresh()
    },
    { immediate: true },
  )
  watch([name, ready], () => clearTimeout(limitTimer))
  let stopRefresh: (() => void) | undefined
  onMounted(() => {
    stopRefresh = registerRefresh('bananjack', refresh, 30_000)
  })
  onBeforeUnmount(() => {
    stopRefresh?.()
    clearTimeout(limitTimer)
  })

  return {
    data,
    name,
    ready,
    shownBalance,
    busy,
    loading,
    error,
    bet,
    rules,
    dailyLimit,
    limitReached,
    canBet,
    resetTime,
    game,
    animating,
    caption,
    locked,
    playing,
    completed,
    net,
    outcome,
    dealerValue,
    resultText,
    labels,
    refresh,
    play,
    accept,
  }
}
