export default defineNuxtPlugin((app) => {
  const { ready, name, badgePush } = useUser()
  const tab = crypto.randomUUID?.() ?? `tab_${Date.now()}_${Math.random().toString(36).slice(2)}`
  let token = ''
  let leaving = false
  let queue = Promise.resolve()

  function send(value: string, visible: boolean) {
    if (!value) return
    // Preserve ordering through quick background/foreground and account changes.
    queue = queue
      .then(async () => {
        await fetch('/api/me/presence', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-user-token': value },
          body: JSON.stringify({ tab, visible }),
          keepalive: true,
          signal: AbortSignal.timeout(10_000),
        })
      })
      .catch(() => {})
  }
  function update() {
    send(token, !leaving && document.visibilityState === 'visible')
  }
  const stop = watch(
    [ready, name, badgePush],
    () => {
      const next = ready.value && name.value && badgePush.value ? userToken() : ''
      if (token && token !== next) send(token, false)
      token = next
      update()
    },
    { immediate: true },
  )
  const leave = () => {
    leaving = true
    update()
  }
  const enter = () => {
    leaving = false
    update()
  }
  document.addEventListener('visibilitychange', update)
  window.addEventListener('pagehide', leave)
  window.addEventListener('pageshow', enter)
  const timer = setInterval(() => {
    if (document.visibilityState === 'visible') update()
  }, 30_000)
  const cleanup = () => {
    leaving = true
    update()
    stop()
    clearInterval(timer)
    document.removeEventListener('visibilitychange', update)
    window.removeEventListener('pagehide', leave)
    window.removeEventListener('pageshow', enter)
  }
  app.vueApp.onUnmount(cleanup)
  if (import.meta.hot) import.meta.hot.dispose(cleanup)
})
