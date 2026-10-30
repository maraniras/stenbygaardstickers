import type { EconomyRecord } from '../../shared/types/economy'
import { syncJackStats } from './jack-stats'

export async function economyContext() {
  const stickers = withDistance((await listStickers()).filter(s => s.status === 'approved').map(publicSticker))
  const [ratings, comments] = await Promise.all([ratingsEnabled ? getRatings() : Promise.resolve({}), commentStats()])
  return { stickers, ratings, comments }
}
export type EconomyContext = Awaited<ReturnType<typeof economyContext>>
export function creditBananas(record: EconomyRecord, id: string, amount: number, label: string, now = new Date()) {
  if (record.claims[id]) return false
  if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error('Ugyldig bananbelønning')
  record.claims[id] = true
  record.balance += amount
  record.peakBalance = Math.max(record.peakBalance, record.balance)
  record.history.unshift({ id, amount, label, at: now.toISOString() })
  record.history = record.history.slice(0, 250)
  return true
}
/** Idempotent migration + future rewards. Wallet is never erased on logout. */
export function settleEconomy(record: EconomyRecord, name: string, context: EconomyContext, now = new Date()) {
  syncJackStats(record)
  creditBananas(record, 'welcome', STARTING_BANANAS, 'Velkommen · startsaldo', now)
  for (const s of context.stickers) {
    if (s.placedBy.some(n => sameName(n, name))) creditBananas(record, `sticker:${s.id}`, stickerBananas(s.countryCode, s.distanceKm), `Sticker · ${s.title}`, now)
  }
  const ordered = [...context.stickers].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
  const pioneers = new Map<string, Sticker>()
  for (const s of ordered) if (!pioneers.has(s.countryCode)) pioneers.set(s.countryCode, s)
  for (const [country, sticker] of pioneers) if (sticker.placedBy.some(n => sameName(n, name))) creditBananas(record, `pioneer:${country}`, 60, `Pioner · ${sticker.country}`, now)
  // Rewarding a badge may unlock a wealth tier. Repeat until no new claims.
  for (let pass = 0; pass < 8; pass++) {
    let changed = false
    const badges = badgesFor(name, context.stickers, context.ratings, { now, comments: context.comments, economy: { [nameKey(name)]: publicEconomy(record) } })
    for (const b of badges) {
      if (!b.earned || b.id === 'pioneer') continue
      const levels = b.kind === 'tier' ? b.level : 1
      for (let level = 1; level <= levels; level++) {
        const key = b.kind === 'tier' ? `${b.id}:${level}` : b.id
        record.milestones[key] ??= now.toISOString()
        const amount = bananaRewardFor(b, level)
        if (amount && creditBananas(record, `badge:${key}`, amount, `Badge · ${b.steps?.[level - 1]?.name ?? b.name}`, now)) changed = true
      }
    }
    if (!changed) break
  }
}
export async function syncEconomy(name: string, context?: EconomyContext) {
  const data = context ?? await economyContext()
  return (await mutateEconomy(name, record => settleEconomy(record, name, data))).record
}
export async function syncAllEconomies() {
  const users = await listUsers()
  if (!users.length) return
  const context = await economyContext()
  for (const user of users) await syncEconomy(user.name, context)
}
export async function publicEconomies() {
  const records = await allEconomyRecords()
  return Object.fromEntries(Object.entries(records).map(([name, record]) => [name, publicEconomy(record)]))
}
