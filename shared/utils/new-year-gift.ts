export const NEW_YEAR_GIFT = {
  id: 'new-year:2027',
  amount: 500,
  // Calendar date in Europe/Copenhagen, independent of the games' 04:00 reset.
  startsAt: '2026-12-31T23:00:00.000Z',
  endsAt: '2027-01-01T23:00:00.000Z',
} as const

export function newYearGiftAvailable(now = new Date()) {
  return (
    now.getTime() >= Date.parse(NEW_YEAR_GIFT.startsAt) &&
    now.getTime() < Date.parse(NEW_YEAR_GIFT.endsAt)
  )
}
