// Ny version af appen: hver udgivelse på Vercel får et nyt build-id. Når appen åbnes
// eller kommer i forgrunden og serveren har et andet id, genindlæses den af sig selv
// (det sker lige når man åbner den, så man mærker det knap). På upload- og admin-siderne
// kunne man miste en halvt udfyldt formular – der vises i stedet en boks (UpdateToast.vue),
// og det samme hvis en ny version dukker op, mens appen er åben.
export default defineNuxtPlugin(() => {
  const current = useRuntimeConfig().app.buildId
  const available = useState('update-available', () => false)
  const router = useRouter()
  let lastCheck = 0

  async function check(onOpen: boolean) {
    if (Date.now() - lastCheck < 5_000 || available.value) return
    lastCheck = Date.now()
    try {
      const { id } = await $fetch<{ id: string }>('/api/version', { query: { t: Date.now() } })
      if (!id || id === current) return
      const path = router.currentRoute.value.path
      const busy = path.startsWith('/upload') || path.startsWith('/admin')
      if (onOpen && !busy) window.location.reload()
      else available.value = true
    }
    catch {}
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') check(true)
  })
  window.addEventListener('focus', () => check(true))
  setInterval(() => {
    if (document.visibilityState === 'visible') check(false)
  }, 5 * 60_000)
})
