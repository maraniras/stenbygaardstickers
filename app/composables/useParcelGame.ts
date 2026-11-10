import type { ParcelView, ParcelGame } from '../../shared/types/parcel-game'
import {
  advanceParcels,
  parcelView,
  rollParcel,
  takeParcel,
  parcelCount,
  reserveParcelOpening,
} from '../../shared/utils/parcel-game'
import { parcelRewardPool } from '../../shared/utils/parcel-rewards'
import { gameDay } from '../../shared/utils/game-day'
import { registerRefresh } from '../utils/refresh'

export function useParcelGame(pollMs = 5000) {
  const user = useUser()
  const { ready } = user
  const testMode = import.meta.dev && useRoute().query.preview === '1'
  const fullTable = testMode && useRoute().query.table === 'full'
  const registrationPreview = testMode && useRoute().query.registration === '1'
  const finishedPreview = testMode && useRoute().query.finished === '1'
  const { reload: reloadWallet } = useEconomy()
  const { reload: reloadUsers } = useUsers()
  const name = computed(() => (testMode ? user.name.value || 'Nicole' : user.name.value))
  let demo: ParcelGame | undefined
  const state = ref<ParcelView | null>(null)
  const busy = ref(false),
    loading = ref(false),
    error = ref('')
  const clock = ref(Date.now())
  const rollStage = ref<'rolling' | 'result' | null>(null)
  const rollDie = ref(1)
  let alive = true,
    revision = 0,
    stop: (() => void) | undefined
  let timer: ReturnType<typeof setInterval> | undefined
  let offset = 0
  const seconds = computed(() =>
    state.value?.pending
      ? Math.max(
          0,
          Math.ceil((Date.parse(state.value.pending.deadline) - clock.value - offset) / 1000),
        )
      : 0,
  )
  function apply(data: ParcelView, receivedAt = Date.now()) {
    offset = Date.parse(data.serverNow) - receivedAt
    state.value = data
  }
  function demoBoard() {
    if (!demo) {
      const players = [
        ...new Set([
          name.value!,
          'Mathias',
          'Norsk',
          'Tobias Frost',
          ...(finishedPreview ? ['Emil', 'Mikkel', 'Anna', 'Jonas', 'Sofie', 'Lucas'] : []),
        ]),
      ].filter((p) => !registrationPreview || p !== name.value)
      demo = {
        year: 2026,
        startsAt: new Date(Date.now() - 86400000).toISOString(),
        endsAt: new Date(Date.now() + 86400000).toISOString(),
        ended: false,
        players,
        turns: {},
        pending: {},
        events: [],
        parcels: Array.from(
          { length: registrationPreview ? parcelCount(players.length) : fullTable ? 24 : 8 },
          (_, i) => ({
            id: `p${i + 1}`,
            style: i % 8,
            owner:
              registrationPreview || fullTable || i < 4
                ? null
                : players[1 + (i % (players.length - 1))]!,
            amount: 50 * (i + 1),
          }),
        ),
      }
      if (finishedPreview) {
        demo.ended = true
        demo.endsAt = new Date(Date.now() - 3600000).toISOString()
        demo.prizesAssigned = true
        demo.parcels = parcelRewardPool(parcelCount(players.length)).map((reward, i) => ({
          id: `p${i + 1}`,
          style: i % 8,
          owner: i < 8 ? name.value! : players[1 + (i % (players.length - 1))]!,
          amount: reward.amount,
          reward,
          ...(i >= 8 && i % 3 === 0 ? { openedAt: new Date().toISOString() } : {}),
        }))
      }
    }
    return demo
  }
  function demoView() {
    const data = parcelView(demoBoard(), name.value, new Date())
    if (registrationPreview) {
      data.phase = 'registration'
      data.registrationOpen = true
    }
    return data
  }
  async function refresh() {
    if (testMode) {
      const board = demoBoard()
      advanceParcels(board, new Date())
      apply(demoView())
      return
    }
    if (!alive || !ready.value || busy.value || loading.value) return
    const mine = revision,
      token = userToken()
    loading.value = true
    try {
      const data = await $fetch<ParcelView>('/api/games/parcel', {
        headers: { 'x-user-token': token },
        retry: 0,
        timeout: 15000,
      })
      if (alive && mine === revision && token === userToken()) {
        apply(data)
        error.value = ''
      }
    } catch {
      if (alive && mine === revision) error.value = 'Bordet kunne ikke hentes. Prøv igen.'
    } finally {
      loading.value = false
      if (alive && mine !== revision) void refresh()
    }
  }
  async function act(kind: 'roll' | 'pick' | 'enroll' | 'open', parcel?: string) {
    if (busy.value || !name.value || !state.value) return
    if (
      kind === 'enroll'
        ? !state.value.registrationOpen || state.value.joined
        : kind === 'open'
          ? state.value.phase !== 'ended' || !state.value.joined
          : state.value.phase !== 'playing' || !state.value.joined
    )
      return
    const mine = revision,
      token = userToken()
    const id = kind === 'pick' ? state.value.pending?.id : crypto.randomUUID()
    if (!id) return
    busy.value = true
    if (kind === 'roll') rollStage.value = 'rolling'
    error.value = ''
    try {
      const start = Date.now()
      let data: ParcelView
      if (testMode) {
        const board = demoBoard(),
          now = new Date()
        advanceParcels(board, now)
        if (kind === 'open') {
          const p = reserveParcelOpening(board, name.value, parcel!, now)
          p.openedAt = p.openingAt
        } else if (kind === 'enroll') {
          if (!board.players.includes(name.value)) {
            board.players.push(name.value)
            while (board.parcels.length < parcelCount(board.players.length)) {
              board.parcels.push({
                id: `p${board.parcels.length + 1}`,
                style: board.parcels.length % 8,
                owner: null,
                amount: 100,
              })
            }
          }
        } else if (kind === 'roll')
          rollParcel(
            board,
            name.value,
            gameDay(now),
            id,
            parcel === 'six' ? 6 : Math.floor(Math.random() * 6) + 1,
            0,
            now,
          )
        else takeParcel(board, name.value, parcel!, now)
        data = demoView()
      } else
        data = await $fetch<ParcelView>('/api/games/parcel', {
          method: 'POST',
          headers: { 'x-user-token': token },
          body: { kind, id, day: state.value.day, parcel },
          retry: 0,
          timeout: 15000,
        })
      const receivedAt = Date.now()
      const current = () => alive && mine === revision && token === userToken()
      if (!current()) return
      if (kind === 'roll') {
        const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 200 : 2300
        await new Promise((resolve) =>
          setTimeout(resolve, Math.max(0, duration - (Date.now() - start))),
        )
        if (!current()) return
        rollDie.value = data.turn?.die ?? 1
        rollStage.value = 'result'
      }
      apply(data, receivedAt)
      if ((kind === 'enroll' || kind === 'open') && !testMode) {
        await reloadWallet()
        if (kind === 'open') await reloadUsers()
      }
      if (kind === 'roll') await new Promise((resolve) => setTimeout(resolve, 2000))
    } catch (e: any) {
      if (alive && mine === revision)
        error.value =
          e?.data?.statusMessage || 'Forbindelsen blev afbrudt. Vi tjekker dit gemte slag.'
    } finally {
      if (mine === revision) rollStage.value = null
      busy.value = false
      if (alive) {
        const message = error.value
        await refresh()
        if (mine === revision && message) error.value = message
      }
    }
  }
  watch(
    [name, ready],
    () => {
      revision++
      rollStage.value = null
      state.value = null
      void refresh()
    },
    { immediate: true },
  )
  onMounted(() => {
    stop = registerRefresh('parcel-game', refresh, pollMs)
    timer = setInterval(() => {
      clock.value = Date.now()
      if (state.value?.pending && seconds.value === 0) void refresh()
    }, 1000)
  })
  onBeforeUnmount(() => {
    alive = false
    revision++
    stop?.()
    clearInterval(timer)
  })
  return { state, name, busy, loading, error, seconds, refresh, act, testMode, rollStage, rollDie }
}
