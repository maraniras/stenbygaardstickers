import type { Badge } from './badges'
import type { EconomyPublic } from '../types/economy'
import type { ParcelGame } from '../types/parcel-game'

export type ParcelBadgeId = 'parcel-empty' | 'parcel-sixes' | 'parcel-three' | 'parcel-five'
export type ParcelAchievements = Partial<Record<ParcelBadgeId, string>>

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
    if (gifts >= 5) earned['parcel-five'] = game.endsAt
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
      name: 'Pakkebaron',
      emoji: '👑',
      about: 'Slut pakkelegen med mindst fem gaver',
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
