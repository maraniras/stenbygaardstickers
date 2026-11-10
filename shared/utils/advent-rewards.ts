import type { AdventOpening, AdventPrize, AdventReward } from '../types/advent'

export const ADVENT_REWARDS: Record<AdventReward, AdventPrize> = {
  cake: {
    kind: 'physical',
    reward: 'cake',
    amount: 50,
    title: 'Du har vundet træstammer!',
    description: 'Rigtige træstammer og 50 bananer.',
    instructions: 'Din præmie er gemt. Kontakt Mathias om udlevering.',
  },
  'faxe-kondi': {
    kind: 'physical',
    reward: 'faxe-kondi',
    amount: 50,
    title: 'Du har vundet en Faxe Kondi!',
    description: 'En rigtig flaske Faxe Kondi og 50 bananer.',
    instructions: 'Din præmie er gemt. Kontakt Mathias om udlevering.',
  },
  'banana-single': {
    kind: 'bananas',
    reward: 'banana-single',
    amount: 25,
    title: 'En enkelt julebanan',
    description: 'Lidt er også banan.',
  },
  'banana-small': {
    kind: 'bananas',
    reward: 'banana-small',
    amount: 100,
    title: 'En lille bunke bananer',
    description: 'Nogen har været forbi frugtskålen.',
  },
  'banana-large': {
    kind: 'bananas',
    reward: 'banana-large',
    amount: 250,
    title: 'En stor bunke bananer',
    description: 'Der blev ikke sparet på julebananerne.',
  },
  elf: {
    kind: 'bananas',
    reward: 'elf',
    amount: -75,
    title: 'Drillenissen!',
    description: 'Nissen har været i dit lager. Saldoen kan aldrig komme under nul.',
  },
  'mix-max': {
    kind: 'physical',
    reward: 'mix-max',
    amount: 250,
    title: 'Du har vundet en Mix Max!',
    description: 'En rigtig Mix Max og 250 bananer.',
    instructions: 'Din præmie er gemt. Kontakt Mathias om udlevering.',
  },
  'red-wine': {
    kind: 'physical',
    reward: 'red-wine',
    title: 'Du har vundet rødvin!',
    description: 'En rigtig flaske rødvin venter på dig.',
    instructions: 'Din præmie er gemt. Kontakt Mathias om udlevering.',
  },
  'white-wine': {
    kind: 'physical',
    reward: 'white-wine',
    title: 'Du har vundet hvidvin!',
    description: 'En rigtig flaske hvidvin venter på dig.',
    instructions: 'Din præmie er gemt. Kontakt Mathias om udlevering.',
  },
  'cycling-bottle': {
    kind: 'physical',
    reward: 'cycling-bottle',
    title: 'En cykeldrikkedunk!',
    description: 'En rigtig drikkedunk til din næste cykeltur.',
    instructions: 'Din præmie er gemt. Kontakt Mathias om udlevering.',
  },
  santa: {
    kind: 'bananas',
    reward: 'santa',
    amount: 2500,
    title: 'Du fandt julemanden!',
    description: 'Kalenderens eneste julemand har en ekstra stor banansæk med.',
  },
  'friend-gift': {
    kind: 'friend-gift',
    reward: 'friend-gift',
    amount: 100,
    title: 'En gave til en ven',
    description: 'Vælg en anden bruger, som skal have 100 julebananer fra kalenderen.',
  },
  'self-gift': {
    kind: 'bananas',
    reward: 'self-gift',
    amount: 150,
    title: 'En gave til dig selv',
    description: 'Selvforkælelse er også en juletradition.',
  },
}
export const ADVENT_REWARD_ICONS: Record<AdventReward, string> = {
  cake: 'traestammer-christmas-v1',
  'faxe-kondi': 'faxe-kondi-christmas-v1',
  'banana-single': 'banana-single-christmas-v2',
  'banana-small': 'banana-pile-small-christmas-v2',
  'banana-large': 'banana-pile-large-christmas-v2',
  elf: 'mischief-elf',
  'mix-max': 'mix-max-christmas-v2',
  'red-wine': 'red-wine-christmas-v2',
  'white-wine': 'white-wine-christmas-v2',
  'cycling-bottle': 'cycling-bottle-christmas-v2',
  santa: 'santa-christmas-v1',
  'friend-gift': 'gift-friend-christmas-v1',
  'self-gift': 'gift-self-christmas-v1',
}
export function adventPrizeIcon(prize?: AdventPrize) {
  return `/games/advent/${ADVENT_REWARD_ICONS[prize?.reward ?? 'self-gift']}.webp`
}
export function adventPrizeAmount(prize: AdventPrize) {
  return prize.kind === 'bananas' || prize.kind === 'physical' ? (prize.amount ?? 0) : 0
}
/** A stable, no-payout demonstration; wine is still only behind 23/24. */
export function previewAdventOpening(day: number): AdventOpening {
  const rewards: AdventReward[] = [
    'faxe-kondi',
    'banana-small',
    'banana-large',
    'elf',
    'mix-max',
    'cycling-bottle',
    'santa',
    'friend-gift',
    'self-gift',
    'banana-single',
    'banana-small',
    'elf',
    'banana-large',
    'cake',
    'friend-gift',
    'self-gift',
    'banana-small',
    'elf',
    'mix-max',
    'friend-gift',
    'self-gift',
    'banana-single',
    'red-wine',
    'white-wine',
  ]
  const prize = ADVENT_REWARDS[rewards[day - 1] ?? 'banana-single']
  return { day, openedAt: '2026-12-24T03:00:00.000Z', prize, amount: adventPrizeAmount(prize) }
}
