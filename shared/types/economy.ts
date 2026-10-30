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
export interface BananaTransaction { id: string, amount: number, label: string, at: string }
export interface EconomyPublic {
  jack?: import('./jackStats').JackStatsPublic
  balance: number
  peakBalance: number
  stats: DailyStats
  milestones: Record<string, string>
}
export interface CityRun { guesses: string[], finished: boolean, won: boolean, reward: number }
export interface WheelRun { prize: number, jackpot?: boolean, jackpotAmount?: number }
export interface EconomyRecord extends EconomyPublic {
  jackStats?: import('./jackStats').JackStats
  bananjack?: import('./bananjack').JackGame
  version: 1
  claims: Record<string, true>
  history: BananaTransaction[]
  days: Record<string, { city?: CityRun, wheel?: WheelRun }>
}
export interface DailyCityState extends CityRun {
  options: { id: string, name: string }[]
  answer?: { id: string, name: string }
}
export interface DailyResponse {
  day: string
  nextResetAt: string
  wallet: EconomyPublic
  history: BananaTransaction[]
  city: DailyCityState
  wheel: WheelRun | null
  wheelJackpot: number
}
