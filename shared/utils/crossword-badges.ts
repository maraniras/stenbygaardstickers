import type { Badge } from './badges'
import type { EconomyPublic, EconomyRecord } from '../types/economy'
import { CROSSWORDS } from './crosswords'

export const CROSSWORD_HELP_THRESHOLDS = [1, 5, 10, 25, 50] as const
/** Durable receipts count, never the limited transaction history. */
export function crosswordHelpPurchaseCount(
  record: Pick<EconomyRecord, 'crosswordLetterPurchases'>,
) {
  return Object.values(record.crosswordLetterPurchases ?? {}).reduce(
    (sum, cells) => sum + new Set(cells).size,
    0,
  )
}

export function crosswordHelpBadge(wallet?: EconomyPublic): Badge {
  const value = wallet?.crosswordHelpPurchases ?? 0
  const level = CROSSWORD_HELP_THRESHOLDS.filter((at) => value >= at).length
  return {
    id: 'crossword-help',
    name: 'HJÆÆÆÆLP',
    emoji: '🍼',
    kind: 'tier',
    desc: `Køb hjælp i På Tværs ${CROSSWORD_HELP_THRESHOLDS.join(' / ')} gange`,
    about: 'Købte bogstaver i På Tværs, samlet på tværs af krydsord',
    earned: level > 0,
    level,
    levels: CROSSWORD_HELP_THRESHOLDS.length,
    value,
    next: CROSSWORD_HELP_THRESHOLDS[level],
    nextName: level < CROSSWORD_HELP_THRESHOLDS.length ? `HJÆÆÆÆLP · trin ${level + 1}` : undefined,
    points: 0,
    worth: 0,
    steps: CROSSWORD_HELP_THRESHOLDS.map((at, i) => ({
      at,
      name: `HJÆÆÆÆLP · trin ${i + 1}`,
      label: `Køb hjælp ${at} ${at === 1 ? 'gang' : 'gange'}`,
      reachedAt: wallet?.milestones[`crossword-help:${i + 1}`]?.slice(0, 10),
    })),
    earnedAt: wallet?.milestones[`crossword-help:${level}`]?.slice(0, 10),
  }
}

export function crosswordBadges(wallet?: EconomyPublic): Badge[] {
  const winners: Badge[] = Object.entries(CROSSWORDS)
    .filter(([, definition]) => definition.badge)
    .map(([id, definition]) => {
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
  return [...winners, crosswordHelpBadge(wallet)]
}
