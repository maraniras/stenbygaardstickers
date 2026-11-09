import { gameDay } from './game-day'

/** The calendar is advertised in late November; doors unlock at 04:00 in December. */
export function adventPresentation(now = new Date()) {
  const day = gameDay(now).slice(5)
  const decemberEnded =
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Copenhagen',
      month: '2-digit',
    }).format(now) === '01'
  return {
    visible: !decemberEnded && day >= '11-20',
    open: !decemberEnded && day >= '12-01',
  }
}

export function adventUnlockAt(year: number, day: number) {
  return new Date(Date.UTC(year, 11, day, 3)).toISOString()
}
export function adventAvailableDay(year: number, now = new Date()) {
  const date = gameDay(now)
  if (date < `${year}-12-01`) return 0
  if (date >= `${year}-12-24`) return 24
  return Number(date.slice(-2))
}
