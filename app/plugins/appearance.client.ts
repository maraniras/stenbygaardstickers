export default defineNuxtPlugin(() => {
  const { systemDark, dark } = useAppearance()
  const media = window.matchMedia('(prefers-color-scheme: dark)')
  systemDark.value = media.matches
  const onChange = (event: MediaQueryListEvent) => {
    systemDark.value = event.matches
  }
  media.addEventListener('change', onChange)
  const stop = watchEffect(() => {
    document.documentElement.dataset.appearance = dark.value ? 'dark' : 'light'
  })
  if (import.meta.hot)
    import.meta.hot.dispose(() => {
      media.removeEventListener('change', onChange)
      stop()
    })
})
