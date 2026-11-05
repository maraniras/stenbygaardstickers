import type { EconomyRecord } from '../../shared/types/economy'
import type { CasinoDailyLimit } from '../../shared/types/casino'
import { CASINO_DAILY_LOSS_LIMIT } from '../../shared/utils/casino'
import { gameDay, nextGameReset } from '../../shared/utils/game-day'

function reservedStake(record: EconomyRecord) {
  return record.bananjack?.status === 'playing' ? record.bananjack.staked : 0
}
/** One-time migration: legacy gross counters are complete even if history was trimmed.
 * Only known casino payouts reduce them; unrelated credits never fund the limit. */
function legacyNetLoss(record: EconomyRecord, day: string) {
  const entries = record.history.filter((entry) => {
    if (!/^(bananjack|slots):/.test(entry.id)) return false
    const at = new Date(entry.at)
    return Number.isFinite(at.getTime()) && gameDay(at) === day
  })
  const stakes = (prefix: string) =>
    entries.reduce(
      (sum, entry) => (entry.id.startsWith(prefix) && entry.amount < 0 ? sum - entry.amount : sum),
      0,
    )
  const jack = record.jackDailyWagers
    ? record.jackDailyWagers.day === day
      ? record.jackDailyWagers.amount
      : 0
    : stakes('bananjack:')
  const slots = record.slotGame?.daily
    ? record.slotGame.daily.day === day
      ? record.slotGame.daily.spent
      : 0
    : stakes('slots:')
  const payouts = entries.reduce((sum, entry) => sum + Math.max(0, entry.amount), 0)
  const pending = reservedStake(record)
    ? record.jackDailyWagers?.day === day
      ? Math.min(jack, reservedStake(record))
      : stakes(`bananjack:${record.bananjack!.id}:`)
    : 0
  return jack + slots - payouts - pending
}
function netLossToday(record: EconomyRecord, day: string) {
  if (record.casinoDaily) return record.casinoDaily.day === day ? record.casinoDaily.netLoss : 0
  return legacyNetLoss(record, day)
}
export function casinoDailyLimit(record: EconomyRecord, now = new Date()): CasinoDailyLimit {
  const netLoss = netLossToday(record, gameDay(now)),
    reserved = reservedStake(record)
  return {
    amount: CASINO_DAILY_LOSS_LIMIT,
    netLoss,
    reserved,
    spent: Math.max(0, netLoss),
    remaining: Math.max(0, CASINO_DAILY_LOSS_LIMIT - netLoss - reserved),
    nextResetAt: nextGameReset(now),
  }
}
/** All mutations run inside the shared wallet CAS, alongside debits and payouts. */
export function prepareCasinoDay(record: EconomyRecord, now = new Date()) {
  const day = gameDay(now)
  if (record.casinoDaily?.day !== day)
    record.casinoDaily = { day, netLoss: netLossToday(record, day) }
  return record.casinoDaily!
}
export function checkCasinoWager(record: EconomyRecord, amount: number, now = new Date()) {
  const limit = casinoDailyLimit(record, now)
  if (amount > limit.remaining)
    throw createError({
      statusCode: 409,
      statusMessage: `Du kan højst sætte ${limit.remaining.toLocaleString('da-DK')} bananer mere. Casinoets fælles tabsgrænse er ${limit.amount} bananer og nulstilles kl. 04.00.`,
    })
}
export function recordCasinoResult(record: EconomyRecord, netLoss: number, now = new Date()) {
  prepareCasinoDay(record, now).netLoss += netLoss
}
