import type { Badge } from './badges'
import type { EconomyPublic, EconomyRecord } from '../types/economy'
import type { BoxesAchievements, BoxesBadgeId, BoxesRun } from '../types/boxes'

export function boxesAwards(run: BoxesRun): BoxesBadgeId[] {
  if (run.prizes.length !== 3) return []
  const prizes = run.prizes,
    ids: BoxesBadgeId[] = []
  if (prizes.every((prize) => prize.kind === 'bananas')) ids.push('boxes-hattrick')
  if (prizes.every((prize) => prize.kind === 'elf')) ids.push('boxes-elves')
  if (prizes.every((prize) => prize.kind === 'nit')) ids.push('boxes-miv')
  if (
    prizes.every((prize) => prize.kind === 'bananas') &&
    prizes
      .map((prize) => prize.amount)
      .sort((a, b) => a - b)
      .join(',') === '25,50,100'
  )
    ids.push('boxes-golden')
  return ids
}
/** Migrate recent old runs, and preserve earned combinations when old days are pruned. */
export function boxesAchievements(record: EconomyRecord): BoxesAchievements | undefined {
  const earned = { ...record.boxesAchievements }
  for (const [day, games] of Object.entries(record.days ?? {}).sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    if (!games.boxes) continue
    for (const id of boxesAwards(games.boxes)) earned[id] ??= games.boxes.playedAt ?? day
  }
  return Object.keys(earned).length ? earned : undefined
}
export function boxesBadges(economy?: EconomyPublic): Badge[] {
  const rules: { id: BoxesBadgeId; name: string; emoji: string; about: string }[] = [
    {
      id: 'boxes-hattrick',
      name: 'Hattrick',
      emoji: '🍌',
      about: 'Find tre bananpræmier i samme spil i Dagens bokse',
    },
    {
      id: 'boxes-elves',
      name: 'Nisseinvasion',
      emoji: '🧝',
      about: 'Find alle tre drillenisser i samme spil i Dagens bokse',
    },
    {
      id: 'boxes-miv',
      name: 'Triple Miv',
      emoji: '🙀',
      about: 'Find tre nitter i samme spil i Dagens bokse',
    },
    {
      id: 'boxes-golden',
      name: 'Den gyldne trio',
      emoji: '👑',
      about: 'Find 100, 50 og 25 bananer i samme spil i Dagens bokse',
    },
  ]
  return rules.map((rule): Badge => {
    const at = economy?.boxesAchievements?.[rule.id]
    return {
      ...rule,
      kind: 'single',
      desc: rule.about,
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
