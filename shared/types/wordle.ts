export type WordleMark = 'correct' | 'present' | 'absent'
export interface WordleRun {
  guesses: string[]
  finished: boolean
  won: boolean
  reward: number
}
export interface WordleView extends WordleRun {
  marks: WordleMark[][]
  answer?: string
}
export interface WordleStats {
  played: number
  wins: number
  firstWins: number
  lastWins: number
  quickWins: number
  streak: number
  bestStreak: number
  lastWinDay?: string
  winningGuesses: number
  distribution: number[]
  bananas: number
}
export interface WordleStatsRecord extends WordleStats {
  /** 0 = in progress, -1 = loss, 1–6 = won in that many guesses. Never exposes guesses. */
  counted: Record<string, number>
}
