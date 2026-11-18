import type { Badge } from './badges'
import type { EconomyPublic } from '../types/economy'
import type { WordleStats } from '../types/wordle'

export const WORDLE_BADGE_REWARDS: Record<string, number[]> = {
  'wordle-wins': [10, 25, 50, 100, 200],
  'wordle-streak': [15, 30, 60, 125, 250],
  'wordle-first': [50],
  'wordle-last': [20],
  'wordle-efficient': [75],
}
export function emptyWordleStats(): WordleStats {
  return {
    played: 0,
    wins: 0,
    firstWins: 0,
    lastWins: 0,
    quickWins: 0,
    streak: 0,
    bestStreak: 0,
    winningGuesses: 0,
    distribution: [0, 0, 0, 0, 0, 0],
    bananas: 0,
  }
}
export function wordleBadges(economy?: EconomyPublic): Badge[] {
  const stats = economy?.wordle ?? emptyWordleStats()
  const specs = [
    {
      id: 'wordle-wins',
      name: 'Ordkløver',
      emoji: '📗',
      thresholds: [1, 10, 25, 50, 100],
      value: stats.wins,
      about: 'Løste dagsord i Wordle',
    },
    {
      id: 'wordle-streak',
      name: 'Ordentlig stime',
      emoji: '🔥',
      thresholds: [3, 7, 14, 30, 60],
      value: stats.bestStreak,
      about: 'Spildøgn med et løst Wordle-ord i træk',
    },
    {
      id: 'wordle-first',
      name: 'Ren clairvoyance',
      emoji: '🔮',
      thresholds: [1],
      value: stats.firstWins,
      about: 'Løs et Wordle-ord på første forsøg',
    },
    {
      id: 'wordle-last',
      name: 'På falderebet',
      emoji: '⌛',
      thresholds: [1],
      value: stats.lastWins,
      about: 'Løs et Wordle-ord på sjette forsøg',
    },
    {
      id: 'wordle-efficient',
      name: 'Effektiv yapper',
      emoji: '⚡',
      thresholds: [10],
      value: stats.quickWins,
      about: 'Løs 10 Wordle-dagsord på højst tre forsøg hver',
    },
  ]
  return specs.map(({ id, name, emoji, thresholds, value, about }): Badge => {
    const level = thresholds.filter((at) => value >= at).length
    const single = thresholds.length === 1
    return {
      id,
      name,
      emoji,
      kind: single ? 'single' : 'tier',
      desc: single ? about : `${about}: ${thresholds[0]}`,
      about,
      earned: level > 0,
      level,
      levels: thresholds.length,
      value,
      next: thresholds[level],
      nextName: single ? undefined : `${name} · trin ${level + 1}`,
      points: 0,
      worth: 0,
      steps: single
        ? undefined
        : thresholds.map((at, i) => ({
            at,
            name: `${name} · trin ${i + 1}`,
            label: `${at} · ${about}`,
            reachedAt: economy?.milestones[`${id}:${i + 1}`]?.slice(0, 10),
          })),
      progress: single
        ? { value: Math.min(value, thresholds[0]!), target: thresholds[0]! }
        : undefined,
      earnedAt: economy?.milestones[single ? id : `${id}:${level}`]?.slice(0, 10),
    }
  })
}
