import type { Ref } from 'vue'
import { createRouletteAudio } from '../utils/rouletteAudio'

const KEY = 'stenbygaard-roulette-sound'

export function useRouletteSound(active: Readonly<Ref<boolean>>) {
  const enabled = ref(true)
  try {
    if (typeof window !== 'undefined') enabled.value = localStorage.getItem(KEY) !== 'off'
  } catch {}
  let context: AudioContext | undefined
  let audio: ReturnType<typeof createRouletteAudio> | undefined
  let disposed = false
  let unlocked = false
  let landed = false
  const visible = () => typeof document !== 'undefined' && !document.hidden
  const available = () =>
    !disposed && unlocked && enabled.value && visible() && context?.state === 'running'

  function syncRolling() {
    if (!available()) audio?.stop()
    else if (active.value && !landed) audio?.startRolling()
    else audio?.stopRolling(false)
  }
  function unlock() {
    if (disposed || !enabled.value || !visible() || typeof window === 'undefined') return
    try {
      const Constructor =
        window.AudioContext ??
        (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Constructor) return
      if (!context) {
        context = new Constructor()
        audio = createRouletteAudio(context)
        context.addEventListener('statechange', syncRolling)
      }
      unlocked = true
      syncRolling()
      if (context.state !== 'running')
        void context
          .resume()
          .then(syncRolling)
          .catch(() => {})
    } catch {
      // Unsupported/blocked Web Audio must never break the game or leak its context.
      if (context && !audio) {
        try {
          void context.close().catch(() => {})
        } catch {}
        context = undefined
      }
    }
  }
  const stopActiveWatch = watch(
    active,
    () => {
      landed = false
      syncRolling()
    },
    { flush: 'sync' },
  )
  const stopEnabledWatch = watch(
    enabled,
    () => {
      try {
        if (typeof window !== 'undefined') localStorage.setItem(KEY, enabled.value ? 'on' : 'off')
      } catch {}
      syncRolling()
    },
    { flush: 'sync' },
  )
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', syncRolling)
  onBeforeUnmount(() => {
    disposed = true
    stopActiveWatch()
    stopEnabledWatch()
    if (typeof document !== 'undefined')
      document.removeEventListener('visibilitychange', syncRolling)
    context?.removeEventListener('statechange', syncRolling)
    audio?.dispose()
  })
  return {
    enabled,
    unlock,
    toggle() {
      enabled.value = !enabled.value
      if (enabled.value) unlock()
    },
    tick() {
      if (available()) audio?.tick()
    },
    land() {
      landed = true
      if (available()) audio?.land()
      else audio?.stop()
    },
  }
}
