export interface BoxPrize {
  kind: 'bananas' | 'elf' | 'nit'
  amount: number
}
export interface BoxesRun {
  playedAt?: string
  choices: number[]
  prizes: BoxPrize[]
  /** Actual wallet change, capped at the available balance on a loss. */
  amount: number
  nominal: number
}
export type BoxesBadgeId = 'boxes-hattrick' | 'boxes-elves' | 'boxes-miv' | 'boxes-golden'
export type BoxesAchievements = Partial<Record<BoxesBadgeId, string>>
