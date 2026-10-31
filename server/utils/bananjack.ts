import { randomInt } from 'node:crypto'
import type { EconomyRecord } from '../../shared/types/economy'
import type { JackGame, JackHand, JackAction, JackPublic } from '../../shared/types/bananjack'
import {
  JACK_BETS,
  JACK_MAX_BET,
  jackRank,
  jackValue,
  jackScore,
} from '../../shared/utils/bananjack'
import { syncJackStats } from './jack-stats'
import { jackDailyLimit, reserveJackWager } from './jack-limit'

function jackError(message: string, statusCode = 400): never {
  throw createError({ statusCode, statusMessage: message })
}
export function jackDeck() {
  const cards = Array.from({ length: 312 }, (_, i) => i)
  for (let i = cards.length - 1; i > 0; i--) {
    const j = randomInt(i + 1)
    ;[cards[i], cards[j]] = [cards[j]!, cards[i]!]
  }
  return cards
}
function draw(game: JackGame) {
  const card = game.deck.shift()
  if (card === undefined) throw new Error('Bananjack: kortene slap op')
  return card
}
function transaction(
  record: EconomyRecord,
  id: string,
  amount: number,
  label: string,
  now = new Date(),
) {
  record.balance += amount
  record.peakBalance = Math.max(record.peakBalance, record.balance)
  record.history.unshift({ id, amount, label, at: now.toISOString() })
  record.history = record.history.slice(0, 250)
}
export function jackActions(game: JackGame, balance: number, remaining = Infinity): JackAction[] {
  if (game.status !== 'playing') return []
  const hand = game.hands[game.active]!
  const actions: JackAction[] = ['hit', 'stand']
  if (
    hand.cards.length === 2 &&
    hand.bet * 2 <= JACK_MAX_BET &&
    Math.min(balance, remaining) >= hand.bet
  )
    actions.push('double')
  if (
    hand.cards.length === 2 &&
    game.hands.length < 4 &&
    Math.min(balance, remaining) >= hand.bet &&
    jackValue(hand.cards[0]!) === jackValue(hand.cards[1]!)
  )
    actions.push('split')
  return actions
}
export function jackPublic(record: EconomyRecord, now = new Date()): JackPublic | null {
  const game = record.bananjack
  if (!game) return null
  // Explicit allowlist: the shoe and dealer's hole card never leave the server.
  return {
    id: game.id,
    sequence: game.sequence,
    revision: game.revision,
    hands: game.hands,
    active: game.active,
    status: game.status,
    staked: game.staked,
    payout: game.payout,
    dealer: game.dealer.map((card, i) => (game.status === 'playing' && i > 0 ? null : card)),
    actions: jackActions(game, record.balance, jackDailyLimit(record, now)?.remaining ?? Infinity),
  }
}
function settleJack(record: EconomyRecord) {
  const game = record.bananjack!
  if (game.status === 'finished') return
  const dealerBlackjack = game.dealer.length === 2 && jackScore(game.dealer).total === 21
  if (
    !dealerBlackjack &&
    game.hands.some(
      (h) =>
        jackScore(h.cards).total <= 21 &&
        !(h.cards.length === 2 && !h.fromSplit && jackScore(h.cards).total === 21),
    )
  ) {
    while (jackScore(game.dealer).total < 17) game.dealer.push(draw(game))
  }
  const dealer = jackScore(game.dealer).total
  for (const hand of game.hands) {
    const score = jackScore(hand.cards).total
    const natural = !hand.fromSplit && hand.cards.length === 2 && score === 21
    hand.result =
      score > 21
        ? 'lose'
        : dealerBlackjack
          ? natural
            ? 'push'
            : 'lose'
          : natural
            ? 'blackjack'
            : dealer > 21 || score > dealer
              ? 'win'
              : score === dealer
                ? 'push'
                : 'lose'
    hand.payout =
      hand.result === 'blackjack'
        ? hand.bet * 2.5
        : hand.result === 'win'
          ? hand.bet * 2
          : hand.result === 'push'
            ? hand.bet
            : 0
    game.payout += hand.payout
  }
  game.status = 'finished'
  if (game.payout)
    transaction(
      record,
      `bananjack:${game.id}:payout`,
      game.payout,
      'Bananjack · udbetaling inkl. indsats',
    )
  syncJackStats(record)
}
function advanceJack(record: EconomyRecord) {
  const game = record.bananjack!
  const next = game.hands.findIndex((h) => h.status === 'playing')
  if (next < 0) settleJack(record)
  else game.active = next
}
function classifyHand(hand: JackHand) {
  const score = jackScore(hand.cards).total
  if (score >= 21) hand.status = score > 21 ? 'bust' : 'stood'
}
export function dealJack(
  record: EconomyRecord,
  id: string,
  previous: string | null,
  bet: number,
  deck = jackDeck(),
  now = new Date(),
) {
  const old = record.bananjack
  if (old?.id === id) return // Lost response: same request resumes its round, never another debit.
  if ((old?.id ?? null) !== previous || old?.status === 'playing')
    jackError('Hent din igangværende hånd igen.', 409)
  if (!(JACK_BETS as readonly number[]).includes(bet))
    jackError('Vælg 10, 20, 30, 40 eller 50 bananer.')
  if (record.balance < bet) jackError('Du har ikke bananer nok til den indsats.')
  reserveJackWager(record, bet, now)
  const game: JackGame = {
    id,
    sequence: (old?.sequence ?? 0) + 1,
    revision: 0,
    deck: [...deck],
    dealer: [],
    hands: [{ cards: [], bet, fromSplit: false, status: 'playing' }],
    active: 0,
    status: 'playing',
    staked: bet,
    payout: 0,
  }
  record.bananjack = game
  const hand = game.hands[0]!
  hand.cards.push(draw(game))
  game.dealer.push(draw(game))
  hand.cards.push(draw(game))
  game.dealer.push(draw(game))
  transaction(record, `bananjack:${id}:bet`, -bet, 'Bananjack · indsats', now)
  if (jackScore(hand.cards).total === 21 || jackScore(game.dealer).total === 21) {
    hand.status = 'stood'
    settleJack(record)
  }
}
export function actJack(
  record: EconomyRecord,
  id: string,
  revision: number,
  action: JackAction,
  now = new Date(),
) {
  const game = record.bananjack
  if (!game || game.id !== id) jackError('Hånden er ændret. Hent spillet igen.', 409)
  if (revision < game.revision) return // Duplicate/stale decision cannot draw, split or debit twice.
  if (revision !== game.revision) jackError('Hent den seneste hånd igen.', 409)
  if (!jackActions(game, record.balance).includes(action)) jackError('Det træk er ikke muligt nu.')
  const hand = game.hands[game.active]!
  if (action === 'double' || action === 'split') reserveJackWager(record, hand.bet, now)
  game.revision++
  if (action === 'hit') {
    hand.cards.push(draw(game))
    classifyHand(hand)
  }
  if (action === 'stand') hand.status = 'stood'
  if (action === 'double') {
    hand.doubled = true
    transaction(
      record,
      `bananjack:${id}:double:${game.revision}`,
      -hand.bet,
      'Bananjack · fordobling',
      now,
    )
    game.staked += hand.bet
    hand.bet *= 2
    hand.cards.push(draw(game))
    hand.status = jackScore(hand.cards).total > 21 ? 'bust' : 'stood'
  }
  if (action === 'split') {
    transaction(
      record,
      `bananjack:${id}:split:${game.revision}`,
      -hand.bet,
      'Bananjack · split',
      now,
    )
    game.staked += hand.bet
    const card = hand.cards.pop()!,
      aces = jackRank(card) === 0
    const other: JackHand = {
      cards: [card, draw(game)],
      bet: hand.bet,
      fromSplit: true,
      status: 'playing',
    }
    hand.fromSplit = true
    hand.cards.push(draw(game))
    classifyHand(hand)
    classifyHand(other)
    if (aces) {
      hand.status = 'stood'
      other.status = 'stood'
    }
    game.hands.splice(game.active + 1, 0, other)
  }
  advanceJack(record)
}
