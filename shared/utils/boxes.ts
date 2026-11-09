import type { BoxPrize } from '../types/boxes'
import { nextGameReset } from './game-day'

const DK_YEAR = new Intl.DateTimeFormat('en', { timeZone: 'Europe/Copenhagen', year: 'numeric' })
/** First game opens 20 November at 04:00; the season ends at Danish New Year midnight. */
export function boxesSeason(now = new Date()) {
  const year = DK_YEAR.format(now)
  const startAt = nextGameReset(new Date(`${year}-11-19T12:00:00Z`))
  const endAt = new Date(
    Date.parse(nextGameReset(new Date(`${year}-12-31T12:00:00Z`))) - 4 * 3600_000,
  ).toISOString()
  return {
    active: now.getTime() >= Date.parse(startAt) && now.getTime() < Date.parse(endAt),
    startAt,
    endAt,
  }
}

export const BOX_PRIZES: readonly BoxPrize[] = [
  ...[5, 10, 15, 25, 50, 100].map((amount) => ({ kind: 'bananas' as const, amount })),
  ...[-10, -25, -40].map((amount) => ({ kind: 'elf' as const, amount })),
  ...Array.from({ length: 3 }, () => ({ kind: 'nit' as const, amount: 0 })),
]
export function validBoxChoices(value: unknown): value is number[] {
  return (
    Array.isArray(value) &&
    value.length === 3 &&
    new Set(value).size === 3 &&
    value.every((n) => Number.isInteger(n) && n >= 0 && n < 12)
  )
}
export function boxPrizeIcon(prize: BoxPrize) {
  if (prize.kind === 'elf') return '/games/boxes/mischief-elf.webp'
  if (prize.kind === 'nit') return '/badges/custom/wheel-nits.webp'
  return `/games/boxes/${prize.amount >= 50 ? 'banana-pile-large' : prize.amount >= 15 ? 'banana-pile-small' : 'banana-single'}-christmas-v2.webp`
}
export function boxPrizeLabel(prize: BoxPrize) {
  return prize.kind === 'nit'
    ? 'Miv'
    : `${prize.amount < 0 ? '−' : '+'}${Math.abs(prize.amount)} 🍌`
}
