import { WHEEL_PRIZES } from '../../shared/utils/economy'

// Equal decorative slots; probabilities remain authoritative on the server.
const values = [0, 10, 1, 25, 0, 10, 50, 0, 10, 1, 0, 25, 10, 0, 100, 10, 0, 500, 10, 0]
export const WHEEL_SPIN_MS = 6500
export const WHEEL_SLOTS = values.map((value, index) => ({
  value, index, color: WHEEL_PRIZES.find(p => p.value === value)!.color,
  start: index * 360 / values.length,
  end: (index + 1) * 360 / values.length,
  middle: (index + .5) * 360 / values.length,
}))

/** Sample only selects a visual slot, never the prize or its probability. */
export function wheelTarget(value: number, sample = 0) {
  const matching = WHEEL_SLOTS.filter(slot => slot.value === value)
  if (!matching.length) throw new Error('Ukendt hjulgevinst')
  const slot = matching[Math.min(matching.length - 1, Math.max(0, Math.floor(sample * matching.length)))]!
  return 360 - slot.middle
}
