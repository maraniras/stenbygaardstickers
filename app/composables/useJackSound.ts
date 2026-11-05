import { createCardAudio } from '../utils/cardAudio'
const KEY = 'stenbygaard-jack-sound'
export function useJackSound() {
  const enabled = ref(true)
  try {
    enabled.value = localStorage.getItem(KEY) !== 'off'
  } catch {}
  let context: AudioContext | undefined
  let audio: ReturnType<typeof createCardAudio> | undefined
  function unlock() {
    if (!enabled.value) return
    try {
      const Constructor =
        window.AudioContext ??
        (
          window as typeof window & {
            webkitAudioContext?: typeof AudioContext
          }
        ).webkitAudioContext
      if (!Constructor) return
      if (!context) {
        context = new Constructor()
        audio = createCardAudio(context)
      }
      void context.resume().catch(() => {})
    } catch {
      /* The game also works without audio support. */
    }
  }
  function toggle() {
    enabled.value = !enabled.value
    try {
      localStorage.setItem(KEY, enabled.value ? 'on' : 'off')
    } catch {}
    if (!enabled.value) audio?.stop()
    else unlock()
  }
  onBeforeUnmount(() => audio?.dispose())
  return {
    enabled,
    toggle,
    unlock,
    card() {
      if (!enabled.value || context?.state !== 'running') return
      try {
        audio?.card()
      } catch {
        /* An audio interruption must not interrupt the hand. */
      }
    },
    stop: () => audio?.stop(),
  }
}
