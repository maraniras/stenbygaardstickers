import type { AdventPrize } from '../../shared/types/advent'

export const ADVENT_YEAR = 2026
export interface AdventPrizeConfig {
  day: number
  published: boolean
  prize: AdventPrize | null
}
// All rewards remain private drafts until the user supplies and approves them.
// Physical rewards are per opener; limited stock/drawings require separate rules.
export const ADVENT_PRIZES: AdventPrizeConfig[] = Array.from({ length: 24 }, (_, index) => ({
  day: index + 1,
  published: false,
  prize: null,
}))
