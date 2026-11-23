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
} as const
export type CrosswordId = keyof typeof CROSSWORDS
export function crosswordDefinition(id: CrosswordId = '1') {
  return CROSSWORDS[id]
}
