import type { SlotSpin } from '../../shared/types/slots'
import { SLOT_SYMBOLS } from '../../shared/utils/slots'
export const SLOT_STOP_MS = [2800, 3300, 3800]
export function useSlotPresentation() {
  const positions = ref([7, 8, 9])
  const rolling = ref(false)
  const result = ref<SlotSpin | null>(null)
  const active = useState('slot-animation', () => false)
  let cancel = () => {}
  function reset() {
    cancel()
    rolling.value = false
    active.value = false
    result.value = null
    positions.value = [7, 8, 9]
  }
  async function present(spin: SlotSpin | null, animate: boolean) {
    cancel()
    const indices = spin?.reels.map((id) => SLOT_SYMBOLS.findIndex((s) => s.id === id)) ?? [0, 1, 2]
    if (!animate || !spin || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      rolling.value = false
      active.value = false
      positions.value = indices.map((i) => 7 + i)
      result.value = spin
      return true
    }
    rolling.value = true
    active.value = true
    positions.value = indices.map((i) => 49 + i)
    return new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => {
        rolling.value = false
        active.value = false
        positions.value = indices.map((i) => 7 + i)
        result.value = spin
        cancel = () => {}
        resolve(true)
      }, SLOT_STOP_MS[2]! + 100)
      cancel = () => {
        clearTimeout(timer)
        rolling.value = false
        active.value = false
        resolve(false)
      }
    })
  }
  onBeforeUnmount(reset)
  return { positions, rolling, result, reset, present }
}
