import type { Badge } from './badges'
import type { EconomyPublic, EconomyRecord } from '../types/economy'
import type { AdventStats } from '../types/advent'

export function adventStats(record: EconomyRecord): AdventStats | undefined {
  const years = Object.values(record.advent ?? {})
  const openings = years.flatMap((y) => Object.values(y))
  const received = Object.keys(record.adventGifts ?? {}).length
  if (!openings.length && !received) return undefined
  const prizes = openings.flatMap((o) => [o.prize, ...(o.extras ?? [])])
  return {
    doors: Math.max(0, ...years.map((y) => Object.keys(y).length)),
    given: openings.filter((o) => o.gift?.deliveredAt).length,
    received,
    self: prizes.filter((p) => p.reward === 'self-gift').length,
    elves: prizes.filter((p) => p.reward === 'elf').length,
    santas: prizes.filter((p) => p.reward === 'santa').length,
    physical: prizes.filter((p) => p.kind === 'physical').length,
  }
}
export function adventBadges(wallet?: EconomyPublic): Badge[] {
  const stats = wallet?.adventStats
  const make = (
    id: string,
    name: string,
    emoji: string,
    value: number,
    about: string,
    thresholds = [1],
    names = [name],
  ): Badge => {
    const level = thresholds.filter((n) => value >= n).length,
      single = thresholds.length === 1
    return {
      id,
      name: names[Math.max(0, level - 1)]!,
      emoji,
      kind: single ? 'single' : 'tier',
      desc: single ? about : `${about}: ${thresholds.join(' / ')}`,
      about,
      earned: level > 0,
      level,
      levels: thresholds.length,
      value,
      next: thresholds[level],
      nextName: names[level],
      points: 0,
      worth: 0,
      earnedAt: wallet?.milestones[single ? id : `${id}:${level}`]?.slice(0, 10),
      progress: single ? { value: Math.min(value, 1), target: 1 } : undefined,
      steps: single
        ? undefined
        : thresholds.map((at, i) => ({
            at,
            name: names[i]!,
            label: `${at} åbnede låger`,
            reachedAt: wallet?.milestones[`${id}:${i + 1}`]?.slice(0, 10),
          })),
    }
  }
  return [
    make(
      'advent-doors',
      'Lågejæger',
      '📅',
      stats?.doors ?? 0,
      'Åbn låger i samme julekalender',
      [1, 6, 12, 18, 24],
      ['Første låge', 'Decemberhygge', 'Halvvejs til jul', 'Snart juleaften', 'Lågejæger'],
    ),
    make(
      'advent-giver',
      'Gavmild nisse',
      '🎁',
      stats?.given ?? 0,
      'Send din første gave til en ven',
    ),
    make(
      'advent-receiver',
      'Nogen tænkte på dig',
      '💝',
      stats?.received ?? 0,
      'Modtag din første gave fra en ven',
    ),
    make('advent-self', 'Selvforkælelse', '🎀', stats?.self ?? 0, 'Find en gave til dig selv'),
    make('advent-elf', 'Nissen har set dig', '🧝', stats?.elves ?? 0, 'Mød din første drillenisse'),
    make(
      'advent-santa',
      'Julemandens favorit',
      '🎅',
      stats?.santas ?? 0,
      'Find kalenderens eneste julemand',
    ),
    make(
      'advent-physical',
      'Noget under træet',
      '🎄',
      stats?.physical ?? 0,
      'Vind en fysisk julepræmie',
    ),
  ]
}
