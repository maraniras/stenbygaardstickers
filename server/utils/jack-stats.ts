import type { EconomyRecord } from '../../shared/types/economy'
import { jackScore } from '../../shared/utils/bananjack'
import { emptyJackStats } from '../../shared/utils/jackBadges'

/** Called inside the wallet CAS, including migration of the last saved finished round. */
export function syncJackStats(record: EconomyRecord) {
  const game = record.bananjack
  if (!game || game.status !== 'finished') return
  const stats = (record.jackStats ??= { ...emptyJackStats(), countedSequence: 0, naturalStreak: 0 })
  if (game.sequence <= stats.countedSequence) return
  const wins = game.hands.filter((h) => h.result === 'win' || h.result === 'blackjack')
  const natural =
    game.hands.length === 1 &&
    !game.hands[0]!.fromSplit &&
    game.hands[0]!.cards.length === 2 &&
    jackScore(game.hands[0]!.cards).total === 21
  const startingBet = -(
    record.history.find((t) => t.id === `bananjack:${game.id}:bet`)?.amount ?? 0
  )
  stats.rounds++
  stats.wins += wins.length
  stats.naturals += Number(natural)
  stats.doubleWins += wins.filter(
    (h) => h.doubled ?? (startingBet > 0 && h.bet > startingBet),
  ).length
  stats.splitWins += Number(
    game.hands.length === 2 && game.hands.every((h) => h.fromSplit) && wins.length === 2,
  )
  stats.naturalStreak = natural
    ? game.sequence === stats.countedSequence + 1
      ? stats.naturalStreak + 1
      : 1
    : 0
  stats.bestNaturalStreak = Math.max(stats.bestNaturalStreak, stats.naturalStreak)
  stats.fiveCard21 += game.hands.filter(
    (h) => h.cards.length >= 5 && jackScore(h.cards).total === 21,
  ).length
  if (jackScore(game.dealer).total > 21)
    stats.dealerBustWins += wins.filter((h) => jackScore(h.cards).total <= 16).length
  stats.net += game.payout - game.staked
  stats.countedSequence = game.sequence
}
export function publicJackStats(record: EconomyRecord) {
  const stats = record.jackStats
  if (!stats) return undefined
  const { countedSequence: _, naturalStreak: __, ...publicStats } = stats
  return publicStats
}
