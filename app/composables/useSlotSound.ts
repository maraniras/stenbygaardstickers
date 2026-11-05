import { createSlotAudio } from '../utils/slotAudio'
import { SLOT_STOP_MS } from './useSlotPresentation'
const KEY = 'stenbygaard-slot-sound'
export function useSlotSound() {
  const enabled = ref(true)
  try {
    enabled.value = localStorage.getItem(KEY) !== 'off'
  } catch {}
  let context: AudioContext | undefined
  let audio: ReturnType<typeof createSlotAudio> | undefined
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
        audio = createSlotAudio(context)
      }
      void context.resume().catch(() => {})
    } catch {
      /* Playing remains available without browser audio support. */
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
    start() {
      unlock()
      if (enabled.value) audio?.pull()
    },
    play(multiplier: number) {
      if (!enabled.value || context?.state !== 'running') return
      audio?.play(
        multiplier,
        SLOT_STOP_MS,
        window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      )
    },
    stop: () => audio?.stop(),
  }
}
