// Sæsontema efter dato (shared/utils/seasons.ts). Temaet sættes som data-theme på
// <html> (app.vue), og farver og pynt styres af CSS (main.css + ThemeDecor.vue).
export function useTheme() {
  const theme = useState<Theme>('theme', () => {
    // Fjern et evt. valg fra den gamle midlertidige tema-knap
    try { localStorage.removeItem('stenbygaard-theme') }
    catch {}
    return themeForDate()
  })
  return { theme }
}
