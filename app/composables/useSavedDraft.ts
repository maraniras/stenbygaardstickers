import type { Ref } from 'vue'

/** Device-local text/form drafts. Media bytes and authentication tokens are never stored. */
export function useSavedDraft<T>(key: Ref<string>, initial: () => T) {
  function read() {
    try {
      const value = localStorage.getItem(key.value)
      return value ? (JSON.parse(value) as T) : initial()
    } catch {
      return initial()
    }
  }
  const draft = ref(read()) as Ref<T>
  const restored = ref(false)
  let cleared = false
  let timer: ReturnType<typeof setTimeout> | undefined
  function save() {
    clearTimeout(timer)
    if (cleared) return
    try {
      if (JSON.stringify(draft.value) === JSON.stringify(initial()))
        localStorage.removeItem(key.value)
      else localStorage.setItem(key.value, JSON.stringify(draft.value))
    } catch {
      /* Storage may be full or unavailable. */
    }
  }
  function clear() {
    cleared = true
    clearTimeout(timer)
    try {
      localStorage.removeItem(key.value)
    } catch {
      /* Optional persistence. */
    }
  }
  watch(
    key,
    (_next, previous) => {
      clearTimeout(timer)
      try {
        if (!cleared) localStorage.setItem(previous, JSON.stringify(draft.value))
      } catch {
        /* Optional persistence. */
      }
      cleared = false
      draft.value = read()
    },
    { flush: 'sync' },
  )
  watch(
    draft,
    () => {
      cleared = false
      clearTimeout(timer)
      timer = setTimeout(save, 300)
    },
    { deep: true },
  )
  function backgroundSave() {
    if (document.visibilityState !== 'visible') save()
  }
  onMounted(() => {
    restored.value = JSON.stringify(draft.value) !== JSON.stringify(initial())
    if (typeof window !== 'undefined') {
      window.addEventListener('pagehide', save)
      document.addEventListener('visibilitychange', backgroundSave)
    }
  })
  onBeforeUnmount(() => {
    save()
    if (typeof window !== 'undefined') {
      window.removeEventListener('pagehide', save)
      document.removeEventListener('visibilitychange', backgroundSave)
    }
  })
  return { draft, restored, save, clear }
}
