import type { Badge } from './badges'
import type { EconomyPublic } from '../types/economy'
import type { JackStatsPublic } from '../types/jackStats'

export const JACK_BADGE_REWARDS: Record<string, number[]> = {
  'jack-rounds': [10, 20, 40, 75, 150],
  'jack-wins': [10, 25, 50, 100, 200],
  'jack-naturals': [20, 40, 75, 150, 300],
  'jack-doubles': [15, 30, 60, 100, 200],
  'jack-split': [50],
  'jack-back-to-back': [100],
  'jack-five-card': [75],
  'jack-dealer-bust': [25],
}
export function emptyJackStats(): JackStatsPublic {
  return {
    rounds: 0,
    wins: 0,
    naturals: 0,
    doubleWins: 0,
    splitWins: 0,
    bestNaturalStreak: 0,
    fiveCard21: 0,
    dealerBustWins: 0,
    net: 0,
  }
}
export function jackBadges(economy?: EconomyPublic): Badge[] {
  const stats = economy?.jack ?? emptyJackStats()
  const make = (
    id: string,
    emoji: string,
    names: string[],
    thresholds: number[],
    value: number,
    about: string,
  ): Badge => {
    const level = thresholds.filter((n) => value >= n).length,
      single = thresholds.length === 1
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
  return [
    make(
      'jack-rounds',
      '🃏',
      ['Ved bordet', 'Kender bordet', 'Fast plads', 'Bordchef', 'En del af inventaret'],
      [1, 10, 50, 100, 500],
      stats.rounds,
      'Afsluttede Bananjack-runder',
    ),
    make(
      'jack-wins',
      '🍌',
      ['Bananbanker', 'Bananvinder', 'Chipstabler', 'Banken ryster', 'Bananmagnat'],
      [1, 10, 25, 100, 250],
      stats.wins,
      'Vundne Bananjack-hænder',
    ),
    make(
      'jack-naturals',
      '♠️',
      ['Bananjack!', 'Es i ærmet', 'Naturtalent', 'Es-mester', 'Født med 21'],
      [1, 5, 15, 50, 100],
      stats.naturals,
      'Naturlige blackjacks · også ved lige op',
    ),
    make(
      'jack-doubles',
      '🧊',
      ['Is i maven', 'Koldt overblik', 'Iskold', 'Frysepunktet', 'Absolut nulpunkt'],
      [1, 5, 15, 30, 75],
      stats.doubleWins,
      'Vundne hænder efter fordobling',
    ),
    make(
      'jack-split',
      '✌️',
      ['Del og hersk'],
      [1],
      stats.splitWins,
      'Vind begge hænder i en runde med præcis ét split',
    ),
    make(
      'jack-back-to-back',
      '🔁',
      ['To modne i træk'],
      [2],
      stats.bestNaturalStreak,
      'Få naturlig blackjack i to afsluttede runder i træk',
    ),
    make(
      'jack-five-card',
      '🖐️',
      ['På stregen'],
      [1],
      stats.fiveCard21,
      'Nå præcis 21 med mindst fem kort',
    ),
    make(
      'jack-dealer-bust',
      '💥',
      ['Dealeren gik over'],
      [1],
      stats.dealerBustWins,
      'Vind med højst 16, fordi dealeren går over',
    ),
  ]
}
