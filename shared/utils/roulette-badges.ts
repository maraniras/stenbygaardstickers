import type { Badge } from './badges'
import type { EconomyPublic } from '../types/economy'
import { emptyRouletteStats } from './roulette'

export const ROULETTE_BADGE_REWARDS: Record<string, number[]> = {
  'roulette-rounds': [10, 20, 40, 75, 150],
  'roulette-wins': [10, 25, 50, 100, 200],
  'roulette-straight': [25],
  'roulette-zero': [50],
  'roulette-big-win': [100],
}

export function rouletteBadges(economy?: EconomyPublic): Badge[] {
  const stats = economy?.roulette ?? emptyRouletteStats()
  const make = (
    id: string,
    emoji: string,
    names: string[],
    thresholds: number[],
    value: number,
    about: string,
  ): Badge => {
    const level = thresholds.filter((n) => value >= n).length
    const single = thresholds.length === 1
    return {
      id,
      emoji,
      kind: single ? 'single' : 'tier',
      name: names[Math.max(0, level - 1)]!,
      desc: single ? about : `${about}: ${thresholds[0]}`,
      about,
      earned: level > 0,
      level,
      levels: thresholds.length,
      value,
      next: thresholds[level],
      nextName: names[level],
      points: 0,
      worth: 0,
      steps: single
        ? undefined
        : thresholds.map((at, i) => ({
            at,
            name: names[i]!,
            label: `${at.toLocaleString('da-DK')} · ${about}`,
            reachedAt: economy?.milestones[`${id}:${i + 1}`]?.slice(0, 10),
          })),
      progress: single
        ? { value: Math.min(value, thresholds[0]!), target: thresholds[0]! }
        : undefined,
      earnedAt: economy?.milestones[single ? id : `${id}:${level}`]?.slice(0, 10),
    }
  }
  const best = economy?.roulette?.bestColourStreak ?? 0
  const colours: Badge[] = [
    { id: 'roulette-colour-five', name: 'Farvesans', target: 5 },
    { id: 'roulette-colour-ten', name: 'Farvemester', target: 10 },
  ].map(({ id, name, target }) => ({
    id,
    name,
    emoji: '🎯',
    kind: 'single',
    desc: `Vind på rød eller sort i ${target} spillede runder i træk med nettooverskud. Du må gerne skifte farve`,
    earned: best >= target,
    level: best >= target ? 1 : 0,
    levels: 1,
    value: best,
    progress: { value: Math.min(best, target), target },
    points: 0,
    worth: 0,
    earnedAt: economy?.milestones[id]?.slice(0, 10),
  }))
  return [
    ...colours,
    make(
      'roulette-rounds',
      '🎡',
      [
        'Første rotation',
        'Med i svinget',
        'Fast ved hjulet',
        'Hjulets stamgæst',
        'Rouletteinventar',
      ],
      [1, 10, 50, 100, 250],
      stats.rounds,
      'Afsluttede roulette-runder med indsats',
    ),
    make(
      'roulette-wins',
      '🏆',
      ['Første gevinst', 'Vinderkurs', 'Medvind', 'Hjulet makker ret', 'Banken bæver'],
      [1, 10, 25, 50, 100],
      stats.wins,
      'Roulette-runder med nettooverskud',
    ),
    make(
      'roulette-straight',
      '🎯',
      ['Lige på tallet'],
      [1],
      stats.straightWins,
      'Vind på et enkelt tal i roulette',
    ),
    make(
      'roulette-zero',
      '🟢',
      ['Grøn bølge'],
      [1],
      stats.zeroWins ?? 0,
      'Vind på en direkte indsats på 0 eller 00',
    ),
    make(
      'roulette-big-win',
      '💰',
      ['Fuldtræffer'],
      [500],
      stats.biggestWin,
      'Vind mindst 500 bananer netto i én roulette-runde',
    ),
  ]
}
