/** Restore the preferred view only when launching at the app's plain home URL. */
export default defineNuxtRouteMiddleware((to) => {
  if (!import.meta.client) return
  const restored = useState('explore-restored', () => false)
  if (restored.value) return
  restored.value = true
  if (to.path !== '/' || Object.keys(to.query).length || to.hash) return
  try {
    const saved = JSON.parse(localStorage.getItem('stenbygaard-explore') || 'null')
    const query = {
      ...(typeof saved?.by === 'string' && saved.by ? { by: saved.by } : {}),
      ...(typeof saved?.country === 'string' && saved.country ? { country: saved.country } : {}),
    }
    if (saved?.path === '/liste') {
      return navigateTo(
        {
          path: '/liste',
          query,
        },
        { replace: true },
      )
    }
    if (saved?.path === '/' && Object.keys(query).length) {
      return navigateTo({ path: '/', query }, { replace: true })
    }
  } catch {
    // A missing or unreadable preference falls back to the map.
  }
})
