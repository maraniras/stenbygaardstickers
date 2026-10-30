import { WHEEL_PRIZES } from '../../shared/utils/economy'

// Equal decorative slots; probabilities remain authoritative on the server.
const values = [0, 10, 1, 25, 0, 10, 50, 0, 10, 1, 0, 25, 10, 0, 100, 10, 0, 500, 10, 0]
const palette: Record<number, { color: string, ink: string }> = {
  0: { color: '#382d4b', ink: '#d9c8e8' },
  1: { color: '#ad91cf', ink: '#2c203b' },
  10: { color: '#f9e4b6', ink: '#4b342b' },
  25: { color: '#dd947e', ink: '#44292a' },
  50: { color: '#b3cda1', ink: '#2c4235' },
  100: { color: '#91b8cb', ink: '#253e51' },
  500: { color: '#f3c55f', ink: '#523319' },
}
export function wheelColor(value: number) { return palette[value]?.color ?? WHEEL_PRIZES.find(p => p.value === value)?.color }
export const WHEEL_SPIN_MS = 6500
export const WHEEL_SLOTS = values.map((value, index) => ({
  value, index, ...palette[value]!,
  start: index * 360 / values.length,
  end: (index + 1) * 360 / values.length,
  middle: (index + .5) * 360 / values.length,
}))

/** Sample only selects a visual slot, never the prize or its probability. */
export function wheelTarget(value: number, sample = 0) {
  // Legacy 500 wins and every new daily jackpot use the same logical gold slot.
  const matching = WHEEL_SLOTS.filter(slot => slot.value === (value >= 400 ? 500 : value))
  if (!matching.length) throw new Error('Ukendt hjulgevinst')
  const slot = matching[Math.min(matching.length - 1, Math.max(0, Math.floor(sample * matching.length)))]!
  return 360 - slot.middle
}
