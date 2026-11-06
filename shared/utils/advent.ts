import { gameDay } from './game-day'

export function adventUnlockAt(year: number, day: number) {
  return new Date(Date.UTC(year, 11, day, 3)).toISOString()
}
export function adventAvailableDay(year: number, now = new Date()) {
  const date = gameDay(now)
  if (date < `${year}-12-01`) return 0
  if (date >= `${year}-12-24`) return 24
  return Number(date.slice(-2))
}
