import type { AdventPrize } from '../../shared/types/advent'

export const ADVENT_YEAR = 2026
export interface AdventPrizeConfig {
  day: number
  published: boolean
  prize: AdventPrize | null
  extras?: AdventPrize[]
}
// Unpublished fallback before the eligibility cutoff.
// Private personal plans and stock-limited awards live in advent-draw.ts.
export const ADVENT_PRIZES: AdventPrizeConfig[] = Array.from({ length: 24 }, (_, index) => ({
  day: index + 1,
  published: false,
  prize: null,
}))
