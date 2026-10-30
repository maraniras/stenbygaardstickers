import type { Badge } from './badges'
import type { DailyStats } from '../types/economy'
import { JACK_BADGE_REWARDS } from './jackBadges'

export const STARTING_BANANAS = 250
export const CITY_REWARDS = [50, 40, 30, 20, 10]
export const WHEEL_PRIZES = [
  { value: 0, weight: 3500, color: '#665879' },
  { value: 1, weight: 1000, color: '#b8a5d1' },
  { value: 10, weight: 3000, color: '#ffd66c' },
  { value: 25, weight: 1800, color: '#ffb57a' },
  { value: 50, weight: 500, color: '#f09e7d' },
  { value: 100, weight: 150, color: '#bcd59a' },
  { value: 500, weight: 50, color: '#f7edaf' },
] as const
/** Chance of today's shared jackpot amount, not of winning a spin. */
export const DAILY_JACKPOTS = [
  { value: 400, weight: 800 }, { value: 450, weight: 1800 },
  { value: 500, weight: 3200 }, { value: 550, weight: 2000 },
  { value: 600, weight: 1000 }, { value: 650, weight: 500 },
  { value: 700, weight: 300 }, { value: 750, weight: 150 },
  { value: 800, weight: 100 }, { value: 850, weight: 70 },
  { value: 900, weight: 50 }, { value: 1000, weight: 30 },
] as const
export function dailyJackpotFor(ticket: number) {
  if (!Number.isInteger(ticket) || ticket < 0 || ticket >= 10000) throw new Error('Ugyldigt jackpotlod')
  let end = 0
  for (const amount of DAILY_JACKPOTS) { end += amount.weight; if (ticket < end) return amount.value }
  throw new Error('Jackpotfordelingen skal summere til 10000')
}
export const GAME_BADGE_REWARDS: Record<string, number[]> = {
  'banana-baron': [50, 100, 200, 400, 800],
  'city-guide': [20, 40, 80, 160, 320],
  'city-gps': [20, 40, 80, 160, 320],
  'city-streak': [10, 25, 50, 100, 250],
  'wheel-spins': [25, 50, 100, 200, 400],
  'wheel-streak': [10, 25, 50, 100, 250],
  'wheel-jackpot': [250], 'city-last': [25], 'wheel-nits': [25],
}
export function emptyDailyStats(): DailyStats {
  return { cityWins: 0, cityFirstWins: 0, cityLastWins: 0, cityStreak: 0, bestCityStreak: 0, wheelSpins: 0, wheelStreak: 0, bestWheelStreak: 0, wheelJackpots: 0, nitStreak: 0, bestNitStreak: 0 }
}
/** Paid per credited person, only once per approved sticker. */
export function stickerBananas(countryCode: string, km: number) {
  if (countryCode.toUpperCase() === 'DK') return 250
  const anchors = [[0, 500], [1000, 750], [2000, 1250], [4000, 2500], [6000, 3750], [8000, 5000]]
  const distance = Math.max(0, Math.min(8000, Number.isFinite(km) ? km : 0))
  for (let i = 1; i < anchors.length; i++) {
    const [x1, y1] = anchors[i - 1]!, [x2, y2] = anchors[i]!
    if (distance <= x2!) return Math.round((y1! + (distance - x1!) / (x2! - x1!) * (y2! - y1!)) / 50) * 50
  }
  return 5000
}
export function wheelPrizeFor(ticket: number, jackpot = 500) {
  if (!DAILY_JACKPOTS.some(p => p.value === jackpot)) throw new Error('Ugyldig jackpot')
  if (!Number.isInteger(ticket) || ticket < 0 || ticket >= 10000) throw new Error('Ugyldigt lod')
  let end = 0
  for (const prize of WHEEL_PRIZES) { end += prize.weight; if (ticket < end) return prize.value === 500 ? jackpot : prize.value }
  return 0
}
/** Full reward per tier, never a second points-based reward for game badges. */
export function bananaRewardFor(badge: Badge, level = badge.kind === 'tier' ? badge.level : 1) {
  const jack = JACK_BADGE_REWARDS[badge.id]
  if (jack) return jack[level - 1] ?? 0
  const game = GAME_BADGE_REWARDS[badge.id]
  if (game) return game[level - 1] ?? 0
  if (badge.kind === 'record') return badge.id.startsWith('year-') && badge.final ? 200 : 0
  if (badge.id === 'pioneer') return 60
  if (badge.kind === 'tier') return (badge.steps?.[level - 1]?.points ?? 0) * 20
  return badge.worth * 20
}
