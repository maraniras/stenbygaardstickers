import type { SlotStats, SlotSymbol } from '../types/slots'
export const SLOT_BETS = [5, 10, 15, 20, 25] as const
export const SLOT_DAILY_LIMIT = 500
export const SLOT_SYMBOLS: { id: SlotSymbol; name: string }[] = [
  { id: 'lemon', name: 'Citron' },
  { id: 'strawberry', name: 'Jordbær' },
  { id: 'mix-max', name: 'Balconi Mix Max' },
  { id: 'faxe-kondi', name: 'Faxe Kondi' },
  { id: 'crowned-banana', name: 'Guldbanan' },
  { id: 'banana-peel', name: 'Bananskræl' },
  { id: 'banana-leaf', name: 'Bananblad' },
]
export const SLOT_PRIZES = [
  { multiplier: 0, weight: 6400, name: 'Miv', symbol: null },
  { multiplier: 1, weight: 2000, name: 'Indsatsen tilbage', symbol: null },
  { multiplier: 2, weight: 1000, name: 'Lille gevinst', symbol: 'lemon' },
  { multiplier: 5, weight: 380, name: 'Frugtfest', symbol: 'strawberry' },
  { multiplier: 10, weight: 170, name: 'Bananboost', symbol: 'mix-max' },
  { multiplier: 25, weight: 40, name: 'Guldbundt', symbol: 'faxe-kondi' },
  { multiplier: 100, weight: 10, name: 'Jackpot!', symbol: 'crowned-banana' },
] as const
export function slotPrizeFor(ticket: number) {
  if (!Number.isInteger(ticket) || ticket < 0 || ticket >= 10000) throw Error('Ugyldigt spinlod')
  let end = 0
  for (const prize of SLOT_PRIZES) {
    end += prize.weight
    if (ticket < end) return prize
  }
  throw Error('Ugyldig resultatfordeling')
}
export function emptySlotStats(): SlotStats {
  return {
    spins: 0,
    wins: 0,
    bigWins: 0,
    jackpots: 0,
    profitStreak: 0,
    bestProfitStreak: 0,
    net: 0,
  }
}
