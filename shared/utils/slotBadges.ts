import type { Badge } from './badges'
import type { EconomyPublic } from '../types/economy'
import { emptySlotStats } from './slots'
export const SLOT_BADGE_REWARDS: Record<string, number[]> = {
  'slot-spins': [10, 20, 40, 75, 150],
  'slot-wins': [10, 25, 50, 100, 200],
  'slot-big-wins': [15, 30, 60, 100, 200],
  'slot-jackpot': [250],
  'slot-streak': [50],
}
export function slotBadges(economy?: EconomyPublic): Badge[] {
  const s = economy?.slots ?? emptySlotStats()
  const rules = [
    {
      id: 'slot-spins',
      emoji: '🎰',
      names: ['Ved håndtaget', 'En tur mere', 'Fast spiller', 'Maskinkender', 'Maskinmester'],
      at: [1, 25, 100, 500, 2000],
      value: s.spins,
      about: 'Spins på Bananditten',
    },
    {
      id: 'slot-wins',
      emoji: '🍌',
      names: ['Den betaler', 'Gevinstjæger', 'Bananbonus', 'Maskinen giver', 'Bananregn'],
      at: [1, 10, 50, 100, 500],
      value: s.wins,
      about: 'Spins med overskud',
    },
    {
      id: 'slot-big-wins',
      emoji: '✨',
      names: ['Guldrush', 'Guldfeber', 'Guldgraver', 'Guldåren', 'Det rene guld'],
      at: [1, 5, 15, 30, 75],
      value: s.bigWins,
      about: 'Spins med mindst 10× indsatsen',
    },
    {
      id: 'slot-jackpot',
      emoji: '👑',
      names: ['Banandittens udvalgte'],
      at: [1],
      value: s.jackpots,
      about: 'Ram jackpot på 100× indsatsen',
    },
    {
      id: 'slot-streak',
      emoji: '🔗',
      names: ['Tre på stribe'],
      at: [3],
      value: s.bestProfitStreak,
      about: 'Få overskud på tre spins i træk',
    },
  ]
  return rules.map((r): Badge => {
    const level = r.at.filter((at) => r.value >= at).length,
      single = r.at.length === 1
    return {
      id: r.id,
      emoji: r.emoji,
      name: r.names[Math.max(0, level - 1)]!,
      kind: single ? 'single' : 'tier',
      desc: r.about,
      about: r.about,
      earned: level > 0,
      level,
      levels: r.at.length,
      value: r.value,
      next: r.at[level],
      nextName: r.names[level],
      points: 0,
      worth: 0,
      steps: single
        ? undefined
        : r.at.map((at, i) => ({
            at,
            name: r.names[i]!,
            label: `${at.toLocaleString('da-DK')} · ${r.about}`,
            reachedAt: economy?.milestones[`${r.id}:${i + 1}`]?.slice(0, 10),
          })),
      progress: single ? { value: Math.min(r.value, r.at[0]!), target: r.at[0]! } : undefined,
      earnedAt: economy?.milestones[single ? r.id : `${r.id}:${level}`]?.slice(0, 10),
    }
  })
}
