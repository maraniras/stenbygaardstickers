export const CROSSWORDS = {
  '1': {
    title: 'På Tværs #1',
    winnerPrize: 1000,
    completionPrize: 0,
    badge: 'crossword-1-winner',
    physicalPrize: true,
    profileFrame: 'original-winner',
    profileBanner: 'original-winner',
  },
  marvel: {
    title: 'På Tværs: Doomsday Special',
    winnerPrize: 500,
    completionPrize: 50,
    badge: 'crossword-marvel-winner',
    physicalPrize: false,
    profileFrame: 'doomsday-winner',
    profileBanner: 'doomsday-winner',
  },
  '2': {
    title: 'På Tværs #2',
    winnerPrize: 1000,
    completionPrize: 50,
    badge: '',
    physicalPrize: false,
    profileFrame: 'crossword-2-winner',
    profileBanner: 'crossword-2-winner',
  },
} as const
export type CrosswordId = keyof typeof CROSSWORDS
// Integer object keys enumerate before named keys; keep the intended menu order explicit.
export const CROSSWORD_IDS: CrosswordId[] = ['1', 'marvel', '2']
export function isCrosswordId(id: unknown): id is CrosswordId {
  return typeof id === 'string' && Object.hasOwn(CROSSWORDS, id)
}
export function crosswordDefinition(id: CrosswordId = '1') {
  return CROSSWORDS[id]
}
