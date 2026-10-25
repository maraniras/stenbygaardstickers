// Sæsontemaer efter dato: halloween 26. oktober – 1. november, jul 20. november –
// 31. december, ellers det normale design. Temaet sættes som data-theme på <html>
// (app.vue), og farver og pynt styres af CSS (main.css + ThemeDecor.vue).
export type Theme = 'normal' | 'halloween' | 'jul'

export function themeForDate(d = new Date()): Theme {
  const m = d.getMonth() + 1
  const day = d.getDate()
  if ((m === 10 && day >= 26) || (m === 11 && day === 1)) return 'halloween'
  if ((m === 11 && day >= 20) || m === 12) return 'jul'
  return 'normal'
}

export function useTheme() {
  const theme = useState<Theme>('theme', () => {
    // Fjern et evt. valg fra den midlertidige tema-knap
    try { localStorage.removeItem('stenbygaard-theme') }
    catch {}
    return themeForDate()
  })
  return { theme }
}
