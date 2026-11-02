import { randomInt } from 'node:crypto'
import type { EconomyRecord } from '../../shared/types/economy'
import type { SlotResponse, SlotSymbol } from '../../shared/types/slots'
import {
  SLOT_BETS,
  SLOT_DAILY_LIMIT,
  SLOT_SYMBOLS,
  SLOT_PRIZES,
  slotPrizeFor,
  emptySlotStats,
} from '../../shared/utils/slots'
import { gameDay, nextGameReset } from '../../shared/utils/game-day'

export function slotResponse(record: EconomyRecord, now = new Date()): SlotResponse {
  const spent = record.slotGame?.daily.day === gameDay(now) ? record.slotGame.daily.spent : 0
  return {
    spin: record.slotGame?.last ?? null,
    balance: record.balance,
    dailyLimit: {
      amount: SLOT_DAILY_LIMIT,
      spent,
      remaining: Math.max(0, SLOT_DAILY_LIMIT - spent),
      nextResetAt: nextGameReset(now),
    },
  }
}
function slotReels(multiplier: number): [SlotSymbol, SlotSymbol, SlotSymbol] {
  const symbol = SLOT_PRIZES.find((prize) => prize.multiplier === multiplier)?.symbol
  if (symbol) return [symbol, symbol, symbol]
  if (multiplier === 1) {
    const pair = SLOT_SYMBOLS[randomInt(4)]!.id
    const reels: [SlotSymbol, SlotSymbol, SlotSymbol] = [
      pair,
      pair,
      randomInt(2) ? 'banana-leaf' : 'banana-peel',
    ]
    const move = randomInt(3)
    if (move !== 2) [reels[move], reels[2]] = [reels[2]!, reels[move]!]
    return reels
  }
  const symbols = SLOT_SYMBOLS.map((s) => s.id)
  const take = () => symbols.splice(randomInt(symbols.length), 1)[0]!
  return [take(), take(), take()]
}
export interface SlotRequest {
  id: string
  previous: string | null
  sequence: number
  bet: number
}
export function spinSlots(
  record: EconomyRecord,
  request: SlotRequest,
  now = new Date(),
  draw = () => randomInt(10000),
) {
  const last = record.slotGame?.last
  if (last?.id === request.id) {
    if (last.bet !== request.bet || last.sequence !== request.sequence)
      throw createError({
        statusCode: 409,
        statusMessage: 'Spinnet er allerede gemt med en anden indsats.',
      })
    return last
  }
  if (request.previous !== (last?.id ?? null) || request.sequence !== (last?.sequence ?? 0) + 1)
    throw createError({
      statusCode: 409,
      statusMessage: 'Spillet er ændret fra en anden enhed. Hent det igen.',
    })
  if (!SLOT_BETS.some((bet) => bet === request.bet))
    throw createError({ statusCode: 400, statusMessage: 'Vælg en indsats fra 10 til 50 bananer.' })
  if (request.bet > slotResponse(record, now).dailyLimit.remaining)
    throw createError({
      statusCode: 409,
      statusMessage: 'Dagens indsatsgrænse er nået. Nyt budget kl. 04.00.',
    })
  if (record.balance < request.bet)
    throw createError({ statusCode: 400, statusMessage: 'Du har ikke nok bananer til indsatsen.' })
  const prize = slotPrizeFor(draw())
  const spin = {
    id: request.id,
    sequence: request.sequence,
    bet: request.bet,
    multiplier: prize.multiplier,
    payout: request.bet * prize.multiplier,
    reels: slotReels(prize.multiplier),
    at: now.toISOString(),
  }
  const stats = { ...(record.slotGame?.stats ?? emptySlotStats()) }
  stats.spins++
  if (prize.multiplier > 1) {
    stats.wins++
    stats.profitStreak++
  } else stats.profitStreak = 0
  stats.bestProfitStreak = Math.max(stats.bestProfitStreak, stats.profitStreak)
  if (prize.multiplier >= 10) stats.bigWins++
  if (prize.multiplier === 100) stats.jackpots++
  stats.net += spin.payout - spin.bet
  const daily = {
    day: gameDay(now),
    spent: slotResponse(record, now).dailyLimit.spent + request.bet,
  }
  // Stake and payout commit with stats and replay protection in the wallet CAS.
  record.balance -= spin.bet
  record.history.unshift({
    id: `slots:${spin.sequence}:bet`,
    amount: -spin.bet,
    label: 'Bananditten · indsats',
    at: spin.at,
  })
  if (spin.payout) {
    record.balance += spin.payout
    record.history.unshift({
      id: `slots:${spin.sequence}:payout`,
      amount: spin.payout,
      label: `Bananditten · ${prize.name} (${prize.multiplier}×)`,
      at: spin.at,
    })
  }
  record.peakBalance = Math.max(record.peakBalance, record.balance)
  record.history = record.history.slice(0, 250)
  record.slotGame = { last: spin, stats, daily }
  return spin
}
