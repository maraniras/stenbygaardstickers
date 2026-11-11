import type { Badge } from './badges'
import type { EconomyPublic } from '../types/economy'
import type { ParcelGame } from '../types/parcel-game'

export type ParcelBadgeId = 'parcel-empty' | 'parcel-sixes' | 'parcel-three' | 'parcel-five'
export type ParcelAchievements = Partial<Record<ParcelBadgeId, string>>

/** Contents, not opening order, wallet balance or badge bonuses decide the champion. */
export function parcelChampion(game: ParcelGame): string | undefined {
  if (!game.ended || game.cancelled) return undefined
  const ranked = game.players
    .map((name, index) => {
      const gifts = game.parcels.filter((p) => p.owner === name)
      const reached = game.reachedCounts?.[`u:${name}`]?.[String(gifts.length)]
      return {
        name,
        index,
        count: gifts.length,
        bananas: gifts.reduce((sum, p) => sum + (p.reward?.amount ?? p.amount), 0),
        at: reached ? Date.parse(reached.at) : Infinity,
        order: reached?.order ?? Infinity,
      }
    })
    .filter((p) => p.count > 0)
  ranked.sort(
    (a, b) =>
      b.count - a.count ||
      b.bananas - a.bananas ||
      a.at - b.at ||
      a.order - b.order ||
      a.index - b.index,
  )
  return ranked[0]?.name
}

/** Only server-confirmed rolls and frozen final ownership can award these badges. */
export function parcelAwards(game: ParcelGame, name: string): ParcelAchievements {
  if (game.cancelled || !game.players.includes(name)) return {}
  const earned: ParcelAchievements = {}
  const sixes = Object.values(game.turns[`u:${name}`] ?? {})
    .flat()
    .filter((turn) => turn.die === 6)
    .sort((a, b) => a.at.localeCompare(b.at))
  if (sixes.length >= 6) earned['parcel-sixes'] = sixes[5]!.at
  if (game.ended) {
    const gifts = game.parcels.filter((p) => p.owner === name).length
    if (gifts === 0) earned['parcel-empty'] = game.endsAt
    if (gifts >= 3) earned['parcel-three'] = game.endsAt
    // Keep x103's stored id and icon; this is the winner of the 2026 campaign, not a 5+ threshold.
    if (game.year === 2026 && parcelChampion(game) === name) earned['parcel-five'] = game.endsAt
  }
  return earned
}

export function parcelBadges(economy?: EconomyPublic): Badge[] {
  const rules: { id: ParcelBadgeId; name: string; emoji: string; about: string }[] = [
    { id: 'parcel-empty', name: 'Røvrendt', emoji: '🫠', about: 'Slut pakkelegen uden gaver' },
    {
      id: 'parcel-sixes',
      name: 'Seksersekspert',
      emoji: '🎲',
      about: 'Slå seks seksere i samme pakkeleg – de behøver ikke være i træk',
    },
    {
      id: 'parcel-three',
      name: 'Gavegrådig',
      emoji: '🎁',
      about: 'Slut pakkelegen med mindst tre gaver',
    },
    {
      id: 'parcel-five',
      name: 'Pakkelegs Champ 2026',
      emoji: '👑',
      about:
        'Vind pakkelegen 2026: flest gaver ved slutningen. Ved uafgjort vinder flest bananer i gaverne, derefter den, der først nåede sit endelige antal gaver',
    },
  ]
  return rules.map((rule): Badge => {
    const at = economy?.parcelAchievements?.[rule.id]
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
