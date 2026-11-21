// Sæsontema efter dato (shared/utils/seasons.ts). Temaet sættes som data-theme på
// <html> (app.vue), og farver og pynt styres af CSS (main.css + ThemeDecor.vue).
export function useTheme() {
  const theme = useState<Theme>('theme', () => {
    // Fjern et evt. valg fra den gamle midlertidige tema-knap
    try {
      localStorage.removeItem('stenbygaard-theme')
    } catch {}
    // Midlertidig lokal julevisning under arbejdet med kalenderen.
    // Produktions- og Preview-builds følger fortsat de normale sæsondatoer.
    return import.meta.dev ? 'jul' : themeForDate()
  })
  if (import.meta.client) {
    let timer: ReturnType<typeof setInterval> | undefined
    const refresh = () => {
      theme.value = import.meta.dev ? 'jul' : themeForDate()
    }
    onMounted(() => {
      timer = setInterval(refresh, 30_000)
      document.addEventListener('visibilitychange', refresh)
      window.addEventListener('focus', refresh)
      refresh()
    })
    onBeforeUnmount(() => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', refresh)
      window.removeEventListener('focus', refresh)
    })
  }
  return { theme }
}
