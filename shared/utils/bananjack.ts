export const JACK_BETS = [10, 20, 30, 40, 50] as const
export const JACK_MAX_BET = 50
export function jackRank(card: number) { return card % 13 }
export function jackValue(card: number) { return Math.min(jackRank(card) + 1, 10) }
export function jackScore(cards: number[]) {
  let total = 0, aces = 0
  for (const card of cards) { const rank = jackRank(card); if (rank === 0) { aces++; total += 11 } else total += jackValue(card) }
  while (total > 21 && aces) { total -= 10; aces-- }
  return { total, soft: aces > 0 }
}
export function jackCardLabel(card: number) {
  const rank = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'][jackRank(card)]!
  const suit = ['spar','hjerter','ruder','klør'][Math.floor(card % 52 / 13)]!
  return `${rank} ${suit}`
}
