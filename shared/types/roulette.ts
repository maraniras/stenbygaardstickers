export type RouletteNumber = `${number}` | '00'
export interface RouletteBet {
  spot: string
  amount: number
}
export interface RouletteReceipt {
  round: number
  number: RouletteNumber
  bets: RouletteBet[]
  stake: number
  payout: number
  net: number
  at: string
}
export interface RouletteStats {
  zeroWins?: number
  colourStreak?: number
  bestColourStreak?: number
  rounds: number
  wins: number
  straightWins: number
  totalStaked: number
  totalPaid: number
  biggestWin: number
  net: number
}
export interface RouletteRecord {
  revision: number
  pending?: { round: number; bets: RouletteBet[]; total: number; roundMs?: 30_000 }
  history: RouletteReceipt[]
  requests: { id: string; fingerprint: string }[]
  stats: RouletteStats
}
export interface RouletteRequest {
  id: string
  round: number
  revision: number
  bets: RouletteBet[]
}
export interface RouletteView {
  serverTime: string
  round: {
    id: number
    startsAt: string
    locksAt: string
    revealsAt: string
    endsAt: string
    phase: 'betting' | 'spinning' | 'result'
    result?: RouletteNumber
  }
  recent: { round: number; number: RouletteNumber }[]
  players: { name: string; bets: RouletteBet[]; total: number }[]
  me?: {
    balance: number
    revision: number
    bets: RouletteBet[]
    total: number
    limit: import('./casino').CasinoDailyLimit
    last?: RouletteReceipt
    stats: RouletteStats
  }
}
