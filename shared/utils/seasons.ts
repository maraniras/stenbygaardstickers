// Sæsoner efter dato: påske (onsdag før palmesøndag – tirsdag efter 2. påskedag),
// halloween 26. oktober – 1. november, jul 20. november – 31. december. Bruges af
// temaet (useTheme.ts) og af sæson-badgene.
export type Theme = 'normal' | 'paaske' | 'halloween' | 'jul'

/** Påskedag (gregoriansk, "anonymous Gregorian algorithm") – måned 1-12 og dag */
export function easterSunday(year: number) {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(year, month - 1, day, 12)
}

/** Påskeperioden: onsdag før palmesøndag (påskedag − 11) til tirsdag efter 2. påskedag (påskedag + 2) */
export function easterPeriod(year: number) {
  const easter = easterSunday(year)
  const start = new Date(easter)
  start.setDate(easter.getDate() - 11)
  const end = new Date(easter)
  end.setDate(easter.getDate() + 2)
  return { start, end }
}

const DANISH_CALENDAR_DATE = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Copenhagen',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})
export function themeForDate(d = new Date()): Theme {
  const parts = DANISH_CALENDAR_DATE.formatToParts(d)
  const value = (type: string) => Number(parts.find((part) => part.type === type)!.value)
  const year = value('year'),
    m = value('month'),
    day = value('day')
  const noon = new Date(year, m - 1, day, 12)
  const easter = easterPeriod(year)
  if (noon >= easter.start && noon <= easter.end) return 'paaske'
  if ((m === 10 && day >= 26) || (m === 11 && day === 1)) return 'halloween'
  if ((m === 11 && day >= 20) || m === 12) return 'jul'
  return 'normal'
}
