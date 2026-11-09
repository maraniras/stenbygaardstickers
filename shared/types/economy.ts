export interface DailyStats {
  cityWins: number
  cityFirstWins: number
  cityLastWins: number
  cityStreak: number
  bestCityStreak: number
  lastCityWinDay?: string
  wheelSpins: number
  wheelStreak: number
  bestWheelStreak: number
  lastWheelDay?: string
  wheelJackpots: number
  nitStreak: number
  bestNitStreak: number
}
export interface BananaTransaction {
  id: string
  amount: number
  label: string
  at: string
}
export interface EconomyPublic {
  boxesAchievements?: import('./boxes').BoxesAchievements
  slots?: import('./slots').SlotStats
  jack?: import('./jackStats').JackStatsPublic
  balance: number
  peakBalance: number
  stats: DailyStats
  milestones: Record<string, string>
}
export interface CityRun {
  guesses: string[]
  finished: boolean
  won: boolean
  reward: number
}
export interface WheelRun {
  prize: number
  jackpot?: boolean
  jackpotAmount?: number
}
export interface EconomyRecord extends EconomyPublic {
  slotGame?: import('./slots').SlotRecord
  jackDailyWagers?: { day: string; amount: number }
  casinoDaily?: { day: string; netLoss: number }
  jackStats?: import('./jackStats').JackStats
  bananjack?: import('./bananjack').JackGame
  version: 1
  claims: Record<string, true>
  history: BananaTransaction[]
  days: Record<string, { city?: CityRun; wheel?: WheelRun; boxes?: import('./boxes').BoxesRun }>
}
export interface DailyCityState extends CityRun {
  options: { id: string; name: string }[]
  answer?: { id: string; name: string; country: string; countryCode: string }
}
export interface DailyResponse {
  boxesActive: boolean
  casinoLimit?: import('./casino').CasinoDailyLimit
  day: string
  nextResetAt: string
  wallet: EconomyPublic
  history: BananaTransaction[]
  city: DailyCityState
  wheel: WheelRun | null
  boxes: import('./boxes').BoxesRun | null
  wheelJackpot: number
}
