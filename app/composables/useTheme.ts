// Sæsontemaer efter dato: påske (onsdag før palmesøndag – tirsdag efter 2. påskedag),
// halloween 26. oktober – 1. november, jul 20. november – 31. december, ellers det
// normale design. Temaet sættes som data-theme på <html> (app.vue), og farver og pynt
// styres af CSS (main.css + ThemeDecor.vue).
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

export function themeForDate(d = new Date()): Theme {
  const m = d.getMonth() + 1
  const day = d.getDate()
  const noon = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12)
  const easter = easterPeriod(d.getFullYear())
  if (noon >= easter.start && noon <= easter.end) return 'paaske'
  if ((m === 10 && day >= 26) || (m === 11 && day === 1)) return 'halloween'
  if ((m === 11 && day >= 20) || m === 12) return 'jul'
  return 'normal'
}

export function useTheme() {
  const theme = useState<Theme>('theme', () => {
    // Fjern et evt. valg fra den gamle midlertidige tema-knap
    try { localStorage.removeItem('stenbygaard-theme') }
    catch {}
    return themeForDate()
  })
  return { theme }
}
