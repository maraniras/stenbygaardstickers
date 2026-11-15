import type {
  RouletteBet,
  RouletteNumber,
  RouletteRequest,
  RouletteView,
} from '../../shared/types/roulette'
import { ROULETTE_MAX_BET, ROULETTE_ROUND_MS, validRouletteSpot } from '../../shared/utils/roulette'

const rouletteClock = new Intl.DateTimeFormat('da-DK', {
  timeZone: 'Europe/Copenhagen',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
})
export function rouletteRoundTime(round: number) {
  return rouletteClock.format(new Date(round * ROULETTE_ROUND_MS)).replaceAll('.', ':')
}

export function useRoulette() {
  const { name } = useUser()
  const economy = useEconomy()
  const animation = useState('roulette-animation', () => false)
  const view = shallowRef<RouletteView | null>(null)
  // Monetary outcomes remain masked until the wheel confirms its visual landing.
  const pendingResult = shallowRef<{ round: number; number: RouletteNumber } | null>(null)
  const landedRound = ref<number | null>(null)
  const safeMe = shallowRef<RouletteView['me']>()
  const safeRecent = shallowRef<RouletteView['recent']>([])
  const presentedView = computed(() => {
    const current = view.value
    if (!current || !pendingResult.value) return current
    return {
      ...current,
      round: { ...current.round, result: undefined },
      recent: safeRecent.value,
      me: current.me
        ? {
            ...current.me,
            balance: safeMe.value?.balance,
            limit: safeMe.value?.limit,
            last: safeMe.value?.last,
            stats: safeMe.value?.stats,
          }
        : undefined,
    }
  })
  const now = ref(Date.now())
  const busy = ref(false)
  const loading = ref(false)
  const error = ref('')
  const acknowledgment = ref('')
  const uncertain = shallowRef<RouletteRequest | null>(null)
  const undoStack = ref<RouletteBet[][]>([])
  let offset = 0
  let lastResponse = 0
  let alive = false
  let generation = 0
  let controller: AbortController | undefined
  let poll: ReturnType<typeof setInterval> | undefined
  let ticker: ReturnType<typeof setInterval> | undefined

  const phase = computed(() => {
    const round = view.value?.round
    if (!round) return 'loading'
    if (now.value >= Date.parse(round.endsAt)) return 'waiting'
    if (now.value >= Date.parse(round.revealsAt)) return 'result'
    if (now.value >= Date.parse(round.locksAt)) return 'spinning'
    return 'betting'
  })
  const fresh = computed(() => now.value - offset - lastResponse < 6500)
  const canEdit = computed(() =>
    Boolean(
      name.value &&
      view.value?.me &&
      phase.value === 'betting' &&
      fresh.value &&
      !busy.value &&
      !pendingResult.value &&
      !uncertain.value,
    ),
  )
  const seconds = computed(() => {
    const round = view.value?.round
    if (!round) return 0
    const end =
      phase.value === 'betting'
        ? round.locksAt
        : phase.value === 'spinning'
          ? round.revealsAt
          : round.endsAt
    return Math.max(0, Math.ceil((Date.parse(end) - now.value) / 1000))
  })
  const revealedResult = computed(() =>
    phase.value === 'result' || phase.value === 'waiting' ? view.value?.round.result : undefined,
  )
  const result = computed(() =>
    view.value?.round.id === landedRound.value ? revealedResult.value : undefined,
  )
  const wheelResult = computed(() => pendingResult.value?.number ?? result.value)
  const wheelRound = computed(() => pendingResult.value?.round ?? view.value?.round.id)
  watch(
    [phase, pendingResult],
    () => {
      animation.value = phase.value === 'spinning' || Boolean(pendingResult.value)
    },
    { immediate: true, flush: 'sync' },
  )
  const last = computed(() => {
    const receipt = presentedView.value?.me?.last
    const round = view.value?.round
    return receipt &&
      round &&
      (receipt.round < round.id ||
        (receipt.round === round.id && now.value >= Date.parse(round.revealsAt)))
      ? receipt
      : undefined
  })

  function accept(response: RouletteView, started: number) {
    const received = Date.now()
    offset = Date.parse(response.serverTime) - (started + received) / 2
    now.value = received + offset
    lastResponse = received
    if (view.value?.round.id !== response.round.id) {
      undoStack.value = []
      acknowledgment.value = ''
      pendingResult.value = null
      landedRound.value = null
    }
    view.value = response
    if (
      response.round.result !== undefined &&
      response.round.id !== landedRound.value &&
      !pendingResult.value
    ) {
      pendingResult.value = { round: response.round.id, number: response.round.result }
    }
    if (!pendingResult.value) {
      safeMe.value = response.me
      safeRecent.value = response.recent
    }
  }

  function settled(round: number) {
    if (pendingResult.value?.round !== round) return
    landedRound.value = round
    pendingResult.value = null
    safeMe.value = view.value?.me
    safeRecent.value = view.value?.recent ?? []
    if (view.value?.me?.last?.round === round && view.value.me.last.stake > 0) refreshEconomy()
  }

  function refreshEconomy() {
    void Promise.allSettled([economy.reload(), economy.reloadPeople()])
  }
  watch(phase, (current, previous) => {
    if (previous !== 'loading' && (current === 'result' || current === 'waiting')) void refresh()
  })

  async function refresh() {
    if (!alive || busy.value || loading.value || document.hidden) return
    const epoch = generation
    const token = userToken()
    const started = Date.now()
    loading.value = true
    controller = new AbortController()
    try {
      const response = await $fetch<RouletteView>('/api/games/roulette', {
        headers: token ? { 'x-user-token': token } : undefined,
        signal: controller.signal,
        timeout: 10_000,
        retry: 0,
      })
      if (alive && epoch === generation && !busy.value && token === userToken()) {
        accept(response, started)
        if (
          !uncertain.value &&
          error.value === 'Forbindelsen til bordet er afbrudt. Prøv at opdatere.'
        )
          error.value = ''
      }
    } catch {
      if (alive && epoch === generation)
        error.value ||= 'Forbindelsen til bordet er afbrudt. Prøv at opdatere.'
    } finally {
      if (epoch === generation) loading.value = false
    }
  }

  async function submit(request: RouletteRequest, previous?: RouletteBet[]) {
    if (busy.value || !alive) return
    busy.value = true
    acknowledgment.value = ''
    error.value = ''
    const epoch = ++generation
    const token = userToken()
    controller?.abort()
    loading.value = false
    controller = new AbortController()
    try {
      const started = Date.now()
      const response = await $fetch<RouletteView>('/api/games/roulette', {
        method: 'POST',
        body: request,
        headers: { 'x-user-token': token },
        signal: controller.signal,
        timeout: 12_000,
        retry: 0,
      })
      if (!alive || epoch !== generation || token !== userToken()) return
      accept(response, started)
      if (phase.value === 'betting' && !pendingResult.value) refreshEconomy()
      uncertain.value = null
      if (previous && response.round.id === request.round) undoStack.value.push(previous)
      acknowledgment.value = `Din indsats til runden kl. ${rouletteRoundTime(request.round)} er bekræftet.`
    } catch (e: unknown) {
      if (!alive || epoch !== generation || token !== userToken()) return
      const failure = e as {
        statusCode?: number
        status?: number
        data?: { statusMessage?: string }
      }
      const status = failure.statusCode ?? failure.status
      if (!status || status >= 500) {
        uncertain.value = request
        undoStack.value = []
        error.value =
          'Svaret mangler. Din ændring kan være modtaget. Genforsøg samme anmodning for at få bekræftelse.'
      } else {
        uncertain.value = null
        undoStack.value = []
        error.value =
          status === 409
            ? 'Bordet eller din indsats er ændret. Vi henter serverens indsatser igen; prøv derefter på ny.'
            : failure.data?.statusMessage || 'Indsatsen blev afvist. Bordet opdateres.'
      }
    } finally {
      if (epoch === generation) {
        busy.value = false
        if (!uncertain.value) await refresh()
      }
    }
  }

  function change(bets: RouletteBet[], remember = true) {
    const current = view.value
    if (!canEdit.value || !current?.me) return
    const total = bets.reduce((sum, b) => sum + b.amount, 0)
    if (
      total > ROULETTE_MAX_BET ||
      bets.some((b) => !validRouletteSpot(b.spot) || b.amount < 5 || b.amount > 50 || b.amount % 5)
    ) {
      error.value = 'Mindst 5 og højst 50 🍌 pr. felt; højst 50 🍌 i alt pr. runde.'
      return
    }
    const extra = total - current.me.total
    if (extra > current.me.balance || extra > current.me.limit.remaining) {
      error.value = 'Der er ikke plads til denne indsats i din saldo eller fælles casinogrænse.'
      return
    }
    const previous = current.me.bets.map((b) => ({ ...b }))
    void submit(
      { id: crypto.randomUUID(), round: current.round.id, revision: current.me.revision, bets },
      remember ? previous : undefined,
    )
  }
  function add(spot: string, amount: number) {
    const bets = (view.value?.me?.bets ?? []).map((b) => ({ ...b }))
    const bet = bets.find((b) => b.spot === spot)
    if (bet) bet.amount += amount
    else bets.push({ spot, amount })
    change(bets)
  }
  function undo() {
    if (!canEdit.value) return
    const previous = undoStack.value.pop()
    if (previous) change(previous, false)
  }
  function visibility() {
    if (!document.hidden) {
      now.value = Date.now() + offset
      void refresh()
    }
  }
  watch(name, () => {
    generation++
    controller?.abort()
    view.value = null
    pendingResult.value = null
    landedRound.value = null
    safeMe.value = undefined
    safeRecent.value = []
    uncertain.value = null
    undoStack.value = []
    busy.value = false
    loading.value = false
    error.value = ''
    acknowledgment.value = ''
    void refresh()
  })
  onMounted(() => {
    alive = true
    void refresh()
    poll = setInterval(() => void refresh(), 2000)
    ticker = setInterval(() => {
      now.value = Date.now() + offset
    }, 200)
    document.addEventListener('visibilitychange', visibility)
    window.addEventListener('focus', visibility)
  })
  onBeforeUnmount(() => {
    animation.value = false
    alive = false
    generation++
    controller?.abort()
    clearInterval(poll)
    clearInterval(ticker)
    document.removeEventListener('visibilitychange', visibility)
    window.removeEventListener('focus', visibility)
  })
  return {
    view: presentedView,
    phase,
    seconds,
    result,
    wheelResult,
    wheelRound,
    landing: computed(() => Boolean(pendingResult.value)),
    settled,
    last,
    fresh,
    canEdit,
    busy,
    loading,
    error,
    acknowledgment,
    uncertain,
    canUndo: computed(() => canEdit.value && undoStack.value.length > 0),
    refresh,
    add,
    undo,
    clear: () => change([]),
    retry: () => {
      if (uncertain.value) void submit(uncertain.value)
    },
  }
}
