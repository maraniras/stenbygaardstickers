import { christmasGames } from '../../shared/utils/christmas-games'
import { parcelSchedule } from '../../shared/utils/parcel-game'

export function useChristmasGames() {
  const now = ref(new Date())
  const { state: parcelCampaign } = useParcelGame(30000)
  const season = computed(() => christmasGames(now.value, parcelCampaign.value))
  const parcelDates = computed(() =>
    parcelSchedule(
      Number(
        now.value.toLocaleDateString('en', { timeZone: 'Europe/Copenhagen', year: 'numeric' }),
      ),
      now.value,
    ),
  )
  let clock: ReturnType<typeof setInterval> | undefined
  onMounted(() => {
    clock = setInterval(() => {
      now.value = new Date()
    }, 1000)
  })
  onBeforeUnmount(() => clearInterval(clock))
  return { now, season, parcelDates, parcelCampaign }
}
