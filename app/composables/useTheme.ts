// Sæsontemaer: halloween 26. oktober – 1. november, jul 20. november – 31. december,
// ellers det normale design. Temaet sættes som data-theme på <html>, og farver og
// pynt styres af CSS (main.css + ThemeDecor.vue).
// Midlertidigt kan temaet skiftes med ThemeButton; valget huskes i browseren.
export type Theme = 'normal' | 'halloween' | 'jul'

const KEY = 'stenbygaard-theme'
const ORDER: Theme[] = ['halloween', 'jul', 'normal']

export function themeForDate(d = new Date()): Theme {
  const m = d.getMonth() + 1
  const day = d.getDate()
  if ((m === 10 && day >= 26) || (m === 11 && day === 1)) return 'halloween'
  if ((m === 11 && day >= 20) || m === 12) return 'jul'
  return 'normal'
}

export function useTheme() {
  const override = useState<Theme | null>('theme-override', () => {
    try {
      const v = localStorage.getItem(KEY)
      return ORDER.includes(v as Theme) ? v as Theme : null
    }
    catch { return null }
  })
  const theme = computed(() => override.value ?? themeForDate())

  function cycle() {
    const next = ORDER[(ORDER.indexOf(theme.value) + 1) % ORDER.length]!
    override.value = next
    try { localStorage.setItem(KEY, next) }
    catch {}
  }

  return { theme, cycle }
}
