import type { ParcelGame, ParcelView } from '../types/parcel-game'
import { gameDay } from './game-day'

const playerKey = (name: string) => `u:${name}`
export const PARCEL_DAILY_ROLLS = 2
export const PARCEL_ENTRY_FEE = 100
export const parcelCount = (participants: number) => participants * 2
/** Distinct wrapping, including a hatbox, giant box, banana and bunch; unrelated to contents. */
export function parcelWrappingStyle(index: number) {
  return [8, 9, 10, 11, 12, 0, 1, 2, 3, 13, 4, 5, 14, 6, 7, 15, 16, 17, 18, 19][index] ?? index % 8
}
export const parcelCollectionUntil = (game: ParcelGame) =>
  new Date(Date.parse(game.endsAt) + 14 * 86400000).toISOString()
export function reserveParcelOpening(game: ParcelGame, name: string, id: string, now = new Date()) {
  if (!game.ended || game.cancelled) fail('Pakkerne kan først åbnes, når pakkelegen er slut.')
  const parcel = game.parcels.find((p) => p.id === id && p.owner === name)
  if (!parcel) fail('Du kan kun åbne dine egne pakker.')
  if (parcel.openedAt || parcel.openingAt) return parcel
  if (now.getTime() >= Date.parse(parcelCollectionUntil(game)))
    fail('Fristen for at åbne pakker er udløbet.')
  parcel.openingAt = now.toISOString()
  return parcel
}
export function parcelSchedule(year: number, now = new Date()) {
  const registrationStartsAt = `${year}-11-20T03:00:00.000Z`
  const registrationEndsAt = `${year}-11-26T23:00:00.000Z`
  const startsAt = `${year}-11-27T03:00:00.000Z`
  return {
    registrationStartsAt,
    registrationEndsAt,
    startsAt,
    registrationOpen:
      now.getTime() >= Date.parse(registrationStartsAt) &&
      now.getTime() < Date.parse(registrationEndsAt),
  }
}
export function parcelTargets(game: ParcelGame, name: string) {
  const middle = game.parcels.filter((p) => !p.owner)
  return middle.length ? middle : game.parcels.filter((p) => p.owner !== name)
}
function fail(message: string): never {
  throw new Error(message)
}
export function takeParcel(game: ParcelGame, name: string, id: string, now: Date) {
  const pending = game.pending[playerKey(name)]
  const parcel = parcelTargets(game, name).find((p) => p.id === id)
  if (!pending || !parcel) fail('Vælg en af de fremhævede pakker.')
  const event = { id: pending.id, from: parcel.owner, to: name, parcel: id, at: now.toISOString() }
  parcel.owner = name
  const order = (game.collectionSequence ?? 0) + 1
  game.collectionSequence = order
  const count = game.parcels.filter((p) => p.owner === name).length
  const reached = ((game.reachedCounts ??= {})[playerKey(name)] ??= {})
  reached[String(count)] ??= { at: now.toISOString(), order }
  const turn = Object.values(game.turns[playerKey(name)] ?? {})
    .flat()
    .find((t) => t.id === pending.id)
  if (turn) turn.parcel = id
  game.events.unshift(event)
  game.events = game.events.slice(0, 100)
  delete game.pending[playerKey(name)]
}
/** Expired choices and final ownership are resolved even when nobody has the app open. */
export function advanceParcels(game: ParcelGame, now: Date) {
  if (game.ended) return
  const end = Date.parse(game.endsAt)
  for (const [key, pending] of Object.entries(game.pending).sort(
    (a, b) =>
      Date.parse(a[1].deadline) - Date.parse(b[1].deadline) || a[1].id.localeCompare(b[1].id),
  )) {
    if (Date.parse(pending.deadline) > now.getTime() && now.getTime() < end) continue
    const name = key.slice(2)
    const targets = parcelTargets(game, name)
    if (targets.length)
      takeParcel(
        game,
        name,
        targets[pending.ticket % targets.length]!.id,
        new Date(Math.min(Date.parse(pending.deadline), end)),
      )
    else delete game.pending[playerKey(name)]
  }
  if (now.getTime() >= end) game.ended = true
}
export function rollParcel(
  game: ParcelGame,
  name: string,
  day: string,
  id: string,
  die: number,
  ticket: number,
  now: Date,
) {
  advanceParcels(game, now)
  if (game.ended || now.getTime() < Date.parse(game.startsAt)) fail('Pakkelegen er ikke åben.')
  if (!game.players.includes(name)) fail('Du er ikke med ved bordet.')
  if (day !== gameDay(now)) fail('Et nyt spildøgn er startet. Hent bordet igen.')
  const days = (game.turns[playerKey(name)] ??= {})
  const turns = (days[day] ??= [])
  if (turns.some((t) => t.id === id)) return
  if (
    Object.values(days)
      .flat()
      .some((t) => t.id === id)
  )
    fail('Dette slag er allerede brugt.')
  if (game.pending[playerKey(name)]) fail('Vælg først din pakke.')
  if (turns.length >= PARCEL_DAILY_ROLLS) fail('Du har brugt dagens to slag.')
  if (!Number.isInteger(die) || die < 1 || die > 6) fail('Ugyldig terning.')
  turns.push({ id, die, at: now.toISOString() })
  if (die === 6 && parcelTargets(game, name).length)
    game.pending[playerKey(name)] = {
      id,
      ticket,
      deadline: new Date(now.getTime() + 60_000).toISOString(),
    }
}
export function parcelView(game: ParcelGame, name: string | null, now: Date): ParcelView {
  const schedule = parcelSchedule(game.year, now)
  const day = gameDay(now)
  const turns = name ? (game.turns[playerKey(name)]?.[day] ?? []) : []
  const pending = name ? game.pending[playerKey(name)] : undefined
  return {
    year: game.year,
    serverNow: now.toISOString(),
    ...schedule,
    // Demo boards can start before the real calendar dates.
    startsAt: game.startsAt,
    joined: !!name && game.players.includes(name),
    entryFee: PARCEL_ENTRY_FEE,
    ...(game.ended
      ? { collectionUntil: parcelCollectionUntil(game), cancelled: game.cancelled ?? false }
      : {}),
    phase: game.ended
      ? now.getTime() >= Date.parse(parcelCollectionUntil(game))
        ? 'archived'
        : 'ended'
      : now.getTime() >= Date.parse(game.startsAt)
        ? 'playing'
        : schedule.registrationOpen
          ? 'registration'
          : 'waiting',
    day,
    remaining: Math.max(0, PARCEL_DAILY_ROLLS - turns.length),
    players: game.players,
    parcels: game.parcels.map((p, index) => ({
      id: p.id,
      style: parcelWrappingStyle(index),
      owner: p.owner,
      ...(game.ended && p.openedAt
        ? {
            amount: p.amount,
            openedAt: p.openedAt,
            reward: p.reward ?? { kind: 'bananas' as const, amount: p.amount, title: 'Banangave' },
          }
        : {}),
    })),
    ...(pending ? { pending: { id: pending.id, deadline: pending.deadline } } : {}),
    ...(turns.length ? { turn: turns[turns.length - 1] } : {}),
    events: game.events,
  }
}
