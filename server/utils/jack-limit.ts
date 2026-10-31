import type { EconomyRecord } from '../../shared/types/economy'
import type { JackDailyLimit } from '../../shared/types/bananjack'
import { JACK_DAILY_WAGER_LIMIT } from '../../shared/utils/bananjack'
import { gameDay, nextGameReset } from '../../shared/utils/game-day'

function spentToday(record: EconomyRecord, day: string) {
  if (record.jackDailyWagers)
    return record.jackDailyWagers.day === day ? record.jackDailyWagers.amount : 0
  // Bootstrap existing accounts from available server history once. Thereafter
  // the persistent counter remains authoritative even when history is trimmed.
  return record.history.reduce((sum, t) => {
    if (!t.id.startsWith('bananjack:') || t.amount >= 0) return sum
    const at = new Date(t.at)
    return Number.isFinite(at.getTime()) && gameDay(at) === day ? sum - t.amount : sum
  }, 0)
}
export function jackDailyLimit(record: EconomyRecord, now = new Date()): JackDailyLimit | null {
  if (JACK_DAILY_WAGER_LIMIT === null) return null
  const spent = spentToday(record, gameDay(now))
  return {
    amount: JACK_DAILY_WAGER_LIMIT,
    spent,
    remaining: Math.max(0, JACK_DAILY_WAGER_LIMIT - spent),
    nextResetAt: nextGameReset(now),
  }
}
/** Must run inside the same wallet CAS as the wager, never as a separate write. */
export function reserveJackWager(record: EconomyRecord, amount: number, now = new Date()) {
  const day = gameDay(now),
    spent = spentToday(record, day)
  if (JACK_DAILY_WAGER_LIMIT !== null && spent + amount > JACK_DAILY_WAGER_LIMIT) {
    const remaining = Math.max(0, JACK_DAILY_WAGER_LIMIT - spent)
    throw createError({
      statusCode: 409,
      statusMessage: remaining
        ? `Du kan kun sætte ${remaining} bananer mere i dag. Grænsen nulstilles kl. 04.00.`
        : 'Dagens indsatsgrænse er nået. Du kan spille igen kl. 04.00.',
    })
  }
  record.jackDailyWagers = { day, amount: spent + amount }
}
