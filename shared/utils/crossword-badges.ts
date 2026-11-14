import type { Badge } from './badges'
import type { EconomyPublic } from '../types/economy'
import { CROSSWORD_WINNER_BADGE } from './crossword'

export function crosswordBadges(wallet?: EconomyPublic): Badge[] {
  const at = wallet?.crosswordWins?.['1']
  return [
    {
      id: CROSSWORD_WINNER_BADGE,
      name: 'Kryds & tværs #1 · Vinder',
      emoji: '🏆',
      kind: 'single',
      desc: 'Vær den første til at løse hele kryds & tværs #1 korrekt',
      earned: !!at,
      level: at ? 1 : 0,
      levels: 1,
      value: at ? 1 : 0,
      progress: { value: at ? 1 : 0, target: 1 },
      points: 0,
      worth: 0,
      earnedAt: at?.slice(0, 10),
    },
  ]
}
