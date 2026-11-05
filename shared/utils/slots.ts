import type { SlotStats, SlotSymbol } from '../types/slots'
export const SLOT_BETS = [5, 10, 15, 20, 25] as const
export const SLOT_DAILY_LIMIT = 500
export const SLOT_SYMBOLS: { id: SlotSymbol; name: string }[] = [
  // Keep the original ID so previously saved spins remain readable.
  { id: 'lemon', name: 'Limoncello' },
  { id: 'strawberry', name: 'Jordbær' },
  { id: 'mix-max', name: 'Balconi Mix Max' },
  { id: 'faxe-kondi', name: 'Faxe Kondi' },
  { id: 'crowned-banana', name: 'Guldbanan' },
  { id: 'banana-peel', name: 'Bananskræl' },
  { id: 'banana-leaf', name: 'Heineken 0.0' },
]
export const SLOT_PRIZES = [
  { multiplier: 0, weight: 6500, name: 'Miv', symbol: null },
  { multiplier: 1, weight: 2000, name: 'Indsatsen tilbage', symbol: null },
  { multiplier: 2, weight: 900, name: 'Frugtfest', symbol: 'strawberry' },
  { multiplier: 5, weight: 380, name: 'Limoncello!', symbol: 'lemon' },
  { multiplier: 10, weight: 170, name: 'Mix Maxing', symbol: 'mix-max' },
  { multiplier: 25, weight: 40, name: "Skal du ha' en Faxe?", symbol: 'faxe-kondi' },
  { multiplier: 100, weight: 10, name: 'Jackpot!', symbol: 'crowned-banana' },
] as const
export const SLOT_RTP =
  SLOT_PRIZES.reduce((sum, prize) => sum + prize.weight * prize.multiplier, 0) / 100
export function slotSymbolImage(id: string) {
  // Legacy IDs remain valid for saved spins; artwork can change independently.
  const asset =
    id === 'lemon'
      ? 'limoncello'
      : id === 'banana-leaf'
        ? 'heineken-00'
        : id === 'faxe-kondi'
          ? 'faxe-kondi-bottle'
          : id
  return `/games/bananditten/${asset}.webp`
}
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
