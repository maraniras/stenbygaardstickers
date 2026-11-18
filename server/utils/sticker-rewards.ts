import type { EconomyRecord } from '../../shared/types/economy'
import { sameName, type Sticker } from '../../shared/utils/sticker'
import { stickerBananas, stickerCountryBananas } from '../../shared/utils/economy'

const MIGRATION_ID = 'sticker-country:v2'

/** Runs inside the wallet CAS; adjusts only sticker credits, never games or badge claims. */
export function settleStickerRewards(
  record: EconomyRecord,
  name: string,
  stickers: Sticker[],
  now = new Date(),
) {
  const mine = [
    ...new Map(
      stickers.filter((s) => s.placedBy.some((n) => sameName(n, name))).map((s) => [s.id, s]),
    ).values(),
  ].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
  const maximum = new Map<string, number>()
  const remember = (country: string, distance: number) =>
    maximum.set(country, Math.max(maximum.get(country) ?? 0, stickerBananas(country, distance)))

  if (!record.stickerRewards) {
    const receipts: NonNullable<EconomyRecord['stickerRewards']>['receipts'] = {}
    let oldTotal = 0,
      newTotal = 0
    for (const s of mine) {
      if (!record.claims[`sticker:${s.id}`]) continue
      const countryCode = s.countryCode.toUpperCase()
      const amount = stickerCountryBananas(countryCode, s.distanceKm, maximum.get(countryCode))
      // The old journal is authoritative when still retained; older claims used the full curve.
      const paid = record.history.find((t) => t.id === `sticker:${s.id}`)?.amount
      oldTotal +=
        typeof paid === 'number' && Number.isSafeInteger(paid) && paid > 0
          ? paid
          : stickerBananas(countryCode, s.distanceKm)
      newTotal += amount
      receipts[s.id] = { countryCode, distanceKm: s.distanceKm, amount, date: s.date }
      remember(countryCode, s.distanceKm)
    }
    const difference = newTotal - oldTotal
    const applied = difference < 0 ? -Math.min(record.balance, -difference) : difference
    record.stickerRewards = {
      version: 2,
      receipts,
      migration: {
        at: now.toISOString(),
        difference,
        applied,
        forgiven: Math.max(0, applied - difference),
      },
    }
    if (!record.claims[MIGRATION_ID]) {
      record.claims[MIGRATION_ID] = true
      record.balance += applied
      record.peakBalance = Math.max(record.peakBalance, record.balance)
      if (applied) {
        record.history.unshift({
          id: MIGRATION_ID,
          amount: applied,
          label: 'Regulering · stickerbelønning pr. land',
          at: now.toISOString(),
        })
        record.history = record.history.slice(0, 250)
      }
    }
  } else {
    for (const receipt of Object.values(record.stickerRewards.receipts))
      remember(receipt.countryCode, receipt.distanceKm)
  }

  for (const s of mine) {
    if (record.claims[`sticker:${s.id}`]) continue
    const countryCode = s.countryCode.toUpperCase()
    const amount = stickerCountryBananas(countryCode, s.distanceKm, maximum.get(countryCode))
    creditBananas(record, `sticker:${s.id}`, amount, `Sticker · ${s.title}`, now)
    record.stickerRewards.receipts[s.id] = {
      countryCode,
      distanceKm: s.distanceKm,
      amount,
      date: s.date,
    }
    remember(countryCode, s.distanceKm)
  }
}
