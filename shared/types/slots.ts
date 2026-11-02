export type SlotSymbol =
  | 'lemon'
  | 'strawberry'
  | 'mix-max'
  | 'faxe-kondi'
  | 'crowned-banana'
  | 'banana-peel'
  | 'banana-leaf'
export interface SlotStats {
  spins: number
  wins: number
  bigWins: number
  jackpots: number
  profitStreak: number
  bestProfitStreak: number
  net: number
}
export interface SlotSpin {
  id: string
  sequence: number
  bet: number
  multiplier: number
  payout: number
  reels: [SlotSymbol, SlotSymbol, SlotSymbol]
  at: string
}
export interface SlotRecord {
  last: SlotSpin
  stats: SlotStats
  daily: { day: string; spent: number }
}
export interface SlotResponse {
  spin: SlotSpin | null
  balance: number
  dailyLimit: { amount: number; spent: number; remaining: number; nextResetAt: string }
}
