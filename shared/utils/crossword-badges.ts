import type { Badge } from './badges'
import type { EconomyPublic } from '../types/economy'
import { CROSSWORDS } from './crosswords'

export function crosswordBadges(wallet?: EconomyPublic): Badge[] {
  return Object.entries(CROSSWORDS).map(([id, definition]) => {
    const at = wallet?.crosswordWins?.[id]
    return {
      id: definition.badge,
      name: definition.title + ' · Vinder',
      emoji: '🏆',
      kind: 'single',
      desc: 'Vær den første til at løse ' + definition.title + ' korrekt',
      earned: !!at,
      level: at ? 1 : 0,
      levels: 1,
      value: at ? 1 : 0,
      progress: { value: at ? 1 : 0, target: 1 },
      points: 0,
      worth: 0,
      earnedAt: at?.slice(0, 10),
    }
  })
}
