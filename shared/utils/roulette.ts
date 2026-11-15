import type { RouletteNumber, RouletteBet, RouletteStats } from '../types/roulette'

export const ROULETTE_MAX_BET = 50
export const ROULETTE_ROUND_MS = 30_000
export const ROULETTE_LOCK_MS = 20_000
export const ROULETTE_REVEAL_MS = 26_000
export const ROULETTE_CHIPS = [5, 10, 25, 50] as const
export const ROULETTE_NUMBERS: RouletteNumber[] = [
  '0',
  '00',
  ...Array.from({ length: 36 }, (_, i) => String(i + 1) as RouletteNumber),
]
// American double-zero wheel, clockwise.
export const ROULETTE_WHEEL: RouletteNumber[] = [
  '0',
  '28',
  '9',
  '26',
  '30',
  '11',
  '7',
  '20',
  '32',
  '17',
  '5',
  '22',
  '34',
  '15',
  '3',
  '24',
  '36',
  '13',
  '1',
  '00',
  '27',
  '10',
  '25',
  '29',
  '12',
  '8',
  '19',
  '31',
  '18',
  '6',
  '21',
  '33',
  '16',
  '4',
  '23',
  '35',
  '14',
  '2',
]
const RED = new Set([
  '1',
  '3',
  '5',
  '7',
  '9',
  '12',
  '14',
  '16',
  '18',
  '19',
  '21',
  '23',
  '25',
  '27',
  '30',
  '32',
  '34',
  '36',
])
export function rouletteColour(value: RouletteNumber) {
  return value === '0' || value === '00' ? 'green' : RED.has(value) ? 'red' : 'black'
}
export function rouletteSpotLabel(spot: string) {
  if (spot.startsWith('n:')) return spot.slice(2)
  const labels: Record<string, string> = {
    red: 'Rød',
    black: 'Sort',
    green: 'Grøn · 0 + 00',
    even: 'Lige',
    odd: 'Ulige',
    low: '1–18',
    high: '19–36',
    'dozen:1': '1–12',
    'dozen:2': '13–24',
    'dozen:3': '25–36',
    'column:1': 'Kolonne 1',
    'column:2': 'Kolonne 2',
    'column:3': 'Kolonne 3',
  }
  return labels[spot] || spot
}
export function rouletteMultiplier(spot: string, result: RouletteNumber) {
  if (spot.startsWith('n:')) return spot === `n:${result}` ? 36 : 0
  if (spot === 'green') return result === '0' || result === '00' ? 18 : 0
  if (result === '0' || result === '00') return 0
  const number = Number(result)
  if (spot === 'red' || spot === 'black') return rouletteColour(result) === spot ? 2 : 0
  if (spot === 'even') return number % 2 === 0 ? 2 : 0
  if (spot === 'odd') return number % 2 === 1 ? 2 : 0
  if (spot === 'low') return number <= 18 ? 2 : 0
  if (spot === 'high') return number >= 19 ? 2 : 0
  if (spot.startsWith('dozen:')) return Math.ceil(number / 12) === Number(spot.slice(6)) ? 3 : 0
  if (spot.startsWith('column:')) return ((number - 1) % 3) + 1 === Number(spot.slice(7)) ? 3 : 0
  return 0
}
export function roulettePayout(bets: RouletteBet[], result: RouletteNumber) {
  return bets.reduce((sum, bet) => sum + bet.amount * rouletteMultiplier(bet.spot, result), 0)
}
export function validRouletteSpot(spot: string) {
  return spot.startsWith('n:')
    ? ROULETTE_NUMBERS.includes(spot.slice(2) as RouletteNumber)
    : [
        'red',
        'black',
        'green',
        'even',
        'odd',
        'low',
        'high',
        'dozen:1',
        'dozen:2',
        'dozen:3',
        'column:1',
        'column:2',
        'column:3',
      ].includes(spot)
}
export function emptyRouletteStats(): RouletteStats {
  return {
    zeroWins: 0,
    colourStreak: 0,
    bestColourStreak: 0,
    rounds: 0,
    wins: 0,
    straightWins: 0,
    totalStaked: 0,
    totalPaid: 0,
    biggestWin: 0,
    net: 0,
  }
}
