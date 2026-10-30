export interface JackStatsPublic {
  rounds: number
  wins: number
  naturals: number
  doubleWins: number
  splitWins: number
  bestNaturalStreak: number
  fiveCard21: number
  dealerBustWins: number
  net: number
}
export interface JackStats extends JackStatsPublic {
  countedSequence: number
  naturalStreak: number
}
