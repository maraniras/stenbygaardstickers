import { refreshVisibleData } from '../utils/refresh'

export default defineNuxtPlugin(() => {
  const foreground = () => refreshVisibleData(true)
  document.addEventListener('visibilitychange', foreground)
  window.addEventListener('focus', foreground)
  const timer = setInterval(() => refreshVisibleData(), 15_000)
  if (import.meta.hot)
    import.meta.hot.dispose(() => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', foreground)
      window.removeEventListener('focus', foreground)
    })
})
