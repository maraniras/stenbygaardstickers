import type { ParcelGame } from '../types/parcel-game'

export interface ParcelPlayerProgress {
  stolen: number
  lost: number
  victims: string[]
  thieves: string[]
  losses: Record<string, number>
  zeroAt?: string
  awards: Record<string, string>
}
export interface ParcelBadgeTracking {
  players: Record<string, ParcelPlayerProgress>
  lastTheft: Record<string, { from: string; to: string }>
}
const key = (name: string) => `u:${name}`
function player(tracking: ParcelBadgeTracking, name: string) {
  return (tracking.players[key(name)] ??= {
    stolen: 0,
    lost: 0,
    victims: [],
    thieves: [],
    losses: {},
    awards: {},
  })
}
function markZero(
  tracking: ParcelBadgeTracking,
  owners: Map<string, string | null>,
  names: string[],
  at: string,
) {
  if (!owners.size || [...owners.values()].some((owner) => !owner)) return
  const held = new Set(owners.values())
  for (const name of names) if (!held.has(name)) player(tracking, name).zeroAt ??= at
}
function record(tracking: ParcelBadgeTracking, event: ParcelGame['events'][number]) {
  const parcelKey = `p:${event.parcel}`
  if (!event.from || event.from === event.to) {
    delete tracking.lastTheft[parcelKey]
    return
  }
  const thief = player(tracking, event.to),
    victim = player(tracking, event.from)
  thief.stolen = Math.min(10, thief.stolen + 1)
  victim.lost = Math.min(10, victim.lost + 1)
  if (!thief.victims.includes(event.from) && thief.victims.length < 5)
    thief.victims.push(event.from)
  if (!victim.thieves.includes(event.to) && victim.thieves.length < 5) victim.thieves.push(event.to)
  victim.losses[parcelKey] = Math.min(3, (victim.losses[parcelKey] ?? 0) + 1)
  const previous = tracking.lastTheft[parcelKey]
  if (previous?.from === event.to && previous.to === event.from)
    thief.awards['parcel-return-to-sender'] ??= event.at
  if (thief.stolen >= 10) thief.awards['parcel-steal-ten'] ??= event.at
  if (victim.lost >= 10) victim.awards['parcel-stolen-ten'] ??= event.at
  if (thief.victims.length >= 5) thief.awards['parcel-grinch'] ??= event.at
  if (victim.thieves.length >= 5) victim.awards['parcel-everyone-against-me'] ??= event.at
  if (victim.losses[parcelKey] >= 3) victim.awards['parcel-mine-again'] ??= event.at
  tracking.lastTheft[parcelKey] = { from: event.from, to: event.to }
}
/** Import only provable retained events once; never infer missing thefts from a truncated feed. */
export function ensureParcelProgress(game: ParcelGame): ParcelBadgeTracking {
  if (game.badgeTracking) return game.badgeTracking
  const tracking: ParcelBadgeTracking = { players: {}, lastTheft: {} }
  game.badgeTracking = tracking
  const owners = new Map(game.parcels.map((p) => [p.id, p.owner]))
  // Recover ownership at the beginning of the retained feed, then replay in original order.
  for (const event of game.events) owners.set(event.parcel, event.from)
  for (const event of [...game.events].reverse()) {
    markZero(tracking, owners, game.players, event.at)
    record(tracking, event)
    owners.set(event.parcel, event.to)
    markZero(tracking, owners, game.players, event.at)
  }
  return tracking
}
/** Called inside the same game CAS as ownership, including automatic timed-out choices. */
export function recordParcelTransfer(game: ParcelGame, event: ParcelGame['events'][number]) {
  const tracking = ensureParcelProgress(game)
  const owners = new Map(game.parcels.map((p) => [p.id, p.owner]))
  markZero(tracking, owners, game.players, event.at)
  record(tracking, event)
  owners.set(event.parcel, event.to)
  markZero(tracking, owners, game.players, event.at)
}
