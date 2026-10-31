import type { JackPublic } from '../../shared/types/bananjack'
import { jackFrames } from '../utils/jackFrames'

export function useJackPresentation() {
  const shown = ref<JackPublic | null>(null),
    caption = ref('')
  const animating = useState('bananjack-animation', () => false)
  let generation = 0,
    disposed = false
  let timer: ReturnType<typeof setTimeout> | undefined, release: (() => void) | undefined
  function cancel() {
    generation++
    clearTimeout(timer)
    release?.()
    release = undefined
    animating.value = false
    caption.value = ''
  }
  function reset() {
    cancel()
    shown.value = null
  }
  async function present(next: JackPublic | null, animate: boolean) {
    if (disposed) return false
    cancel()
    const current = generation
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!animate || !next || reduced) {
      shown.value = next
      return true
    }
    const frames = jackFrames(shown.value, next)
    animating.value = true
    for (const frame of frames) {
      if (current !== generation || disposed) return false
      shown.value = frame.game
      caption.value = frame.label
      if (frame.delay)
        await new Promise<void>((resolve) => {
          release = resolve
          timer = setTimeout(() => {
            release = undefined
            resolve()
          }, frame.delay)
        })
    }
    if (current !== generation || disposed) return false
    animating.value = false
    caption.value = ''
    return true
  }
  onBeforeUnmount(() => {
    disposed = true
    cancel()
  })
  return { shown, animating, caption, present, reset }
}
