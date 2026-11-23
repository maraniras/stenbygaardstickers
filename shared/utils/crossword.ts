import type { CrosswordState } from '../types/crossword'

export const CROSSWORD_PRIZE = 1000
export const CROSSWORD_PHYSICAL_PRIZE = {
  kind: 'rta-mug',
  title: 'RTA-kop',
  image: '/games/prizes/rta-mug-laurel-v2.webp',
} as const
export const CROSSWORD_WINNER_BADGE = 'crossword-1-winner'
export function crosswordOpen(state: CrosswordState, now = new Date()) {
  return !!state.opensAt && Date.parse(state.opensAt) <= now.getTime()
}

/** Opening day plus one full calendar day, then 04:00 in Denmark. */
export function crosswordHelpAt(state: Pick<CrosswordState, 'opensAt' | 'id'>) {
  if (!state.opensAt) return null
  const openingDate = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Copenhagen',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(state.opensAt))
  const date = new Date(openingDate + 'T00:00:00Z')
  // Crossword #1 opened Friday 20 November; first help starts Tuesday 24 November at 04:00.
  date.setUTCDate(
    date.getUTCDate() + (state.id !== 'marvel' && openingDate === '2026-11-20' ? 4 : 2),
  )
  return crosswordOpeningTime(date.toISOString().slice(0, 10) + 'T04:00')
}

/** A wall-clock time entered in admin always means Europe/Copenhagen, including DST. */
export function crosswordOpeningTime(value: unknown) {
  if (value === null || value === '') return null
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))
    throw new Error('Vælg dato og tidspunkt i dansk tid.')
  const target = Date.parse(value + ':00Z')
  if (!Number.isFinite(target)) throw new Error('Ugyldigt tidspunkt.')
  const format = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Copenhagen',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
  let guess = target
  for (let i = 0; i < 4; i++) {
    const local = format.format(new Date(guess)).replace(' ', 'T')
    if (local === value) return new Date(guess).toISOString()
    guess += target - Date.parse(local + ':00Z')
  }
  throw new Error('Tidspunktet findes ikke i dansk tid. Vælg et andet tidspunkt.')
}
