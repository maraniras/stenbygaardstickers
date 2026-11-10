import { randomInt } from 'node:crypto'
import { parcelRewardPool } from '../../shared/utils/parcel-rewards'
import type { ParcelGame } from '../../shared/types/parcel-game'
import {
  advanceParcels,
  parcelCount,
  parcelView,
  rollParcel,
  takeParcel,
  parcelSchedule,
  PARCEL_ENTRY_FEE,
  reserveParcelOpening,
} from '../../shared/utils/parcel-game'
import type { EconomyRecord } from '../../shared/types/economy'
import { parcelAwards } from '../../shared/utils/parcel-badges'

const PARCEL_CAS = `if (redis.call('HGET', KEYS[1], ARGV[1]) or '') ~= ARGV[2] then return 0 end
redis.call('HSET', KEYS[1], ARGV[1], ARGV[3]); return 1`
let localTail = Promise.resolve()
// The paid-entry campaign is isolated from the earlier unlaunched free prototype.
const PARCEL_STORE = 'parcel-games-v2'
export const parcelEntryClaim = (year: number) => `parcel-entry:${year}`
export function payParcelEntry(wallet: EconomyRecord, year: number, now = new Date()) {
  const claim = parcelEntryClaim(year)
  if (wallet.claims[claim]) return false
  if (!parcelSchedule(year, now).registrationOpen)
    throw createError({
      statusCode: 403,
      statusMessage: 'Tilmeldingen er åben fra 20. til og med 26. november.',
    })
  if (wallet.balance < PARCEL_ENTRY_FEE)
    throw createError({
      statusCode: 402,
      statusMessage: 'Du skal have 100 bananer for at tilmelde dig.',
    })
  wallet.balance -= PARCEL_ENTRY_FEE
  wallet.claims[claim] = true
  wallet.history.unshift({
    id: claim,
    amount: -PARCEL_ENTRY_FEE,
    label: `Pakkeleg ${year} · tilmelding`,
    at: now.toISOString(),
  })
  wallet.history = wallet.history.slice(0, 250)
  return true
}
export async function parcelBackup() {
  if (!redisEnabled)
    return (await useStorage('data').getItem<Record<string, ParcelGame>>(PARCEL_STORE)) ?? {}
  const [flat] = (await redis([['HGETALL', PARCEL_STORE]])) as [string[]]
  const out: Record<string, ParcelGame> = {}
  for (let i = 0; i < flat.length; i += 2) out[flat[i]!] = JSON.parse(flat[i + 1]!)
  return out
}
function freshParcels(year: number, names: string[]): ParcelGame {
  const { startsAt } = parcelSchedule(year)
  // 25 December 00:00 through 31 December 23:59:59, Copenhagen winter time.
  const endsAt = new Date(
    Date.parse(`${year}-12-24T23:00:00Z`) + randomInt(7 * 86400) * 1000,
  ).toISOString()
  const players = [...new Set(names)]
  return {
    year,
    startsAt,
    endsAt,
    ended: false,
    players,
    parcels: Array.from({ length: parcelCount(players.length) }, (_, i) => ({
      id: `p${i + 1}`,
      style: i % 8,
      owner: null,
      amount: [25, 50, 75, 100, 150, 250][randomInt(6)]!,
    })),
    turns: {},
    pending: {},
    events: [],
  }
}
/** One global CAS protects ownership, all devices' daily rolls and pending choices together. */
export async function mutateParcels<T>(
  year: number,
  names: string[],
  change: (game: ParcelGame) => T,
) {
  let release = () => {}
  const previous = localTail
  if (!redisEnabled) {
    localTail = new Promise<void>((resolve) => {
      release = resolve
    })
    await previous
  }
  try {
    for (let attempt = 0; attempt < 24; attempt++) {
      const local = !redisEnabled ? await parcelBackup() : undefined
      const raw = redisEnabled
        ? ((await redis([['HGET', PARCEL_STORE, String(year)]]))[0] as string | null)
        : local?.[year]
          ? JSON.stringify(local[year])
          : ''
      const game: ParcelGame = raw ? JSON.parse(raw) : freshParcels(year, names)
      // Update already-created, unstarted calendars without changing their secret end or parcels.
      if (!game.ended && !game.prizesAssigned && game.startsAt === `${year}-12-01T03:00:00.000Z`)
        game.startsAt = parcelSchedule(year).startsAt
      // A paid wallet receipt is the durable membership record, also after a lost response.
      if (!game.ended && Date.now() < Date.parse(game.endsAt)) {
        for (const name of names)
          if (!game.players.includes(name)) {
            game.players.push(name)
          }
        while (game.parcels.length < parcelCount(game.players.length)) {
          game.parcels.push({
            id: `p${game.parcels.length + 1}`,
            style: game.parcels.length % 8,
            owner: null,
            amount: [25, 50, 75, 100, 150, 250][randomInt(6)]!,
          })
        }
      }
      const result = change(game)
      if (redisEnabled) {
        if (
          (await redisEval(
            PARCEL_CAS,
            [PARCEL_STORE],
            [String(year), raw ?? '', JSON.stringify(game)],
          )) !== 1
        )
          continue
      } else await useStorage('data').setItem(PARCEL_STORE, { ...local, [year]: game })
      return { game, result }
    }
    throw createError({ statusCode: 409, statusMessage: 'Bordet er optaget. Prøv igen.' })
  } finally {
    release()
  }
}
export function prepareParcelRewards(game: ParcelGame, now = new Date()) {
  if (game.prizesAssigned || now.getTime() < Date.parse(game.startsAt)) return
  if (game.players.length < 4) {
    game.cancelled = true
    game.ended = true
    game.endsAt = game.startsAt
    game.prizesAssigned = true
    return
  }
  const pool = parcelRewardPool(game.parcels.length)
  for (let i = pool.length - 1; i > 0; i--) {
    const j = randomInt(i + 1)
    ;[pool[i], pool[j]] = [pool[j]!, pool[i]!]
  }
  game.parcels.forEach((p, i) => {
    p.reward = pool[i]!
    p.amount = p.reward.amount
  })
  game.prizesAssigned = true
}
/** Only an explicitly requested opening is paid. A durable reservation repairs partial failures. */
export async function settleParcelPrizes(game: ParcelGame) {
  if (!game.ended) return game
  if (game.cancelled) {
    for (const name of game.players)
      await mutateEconomy(name, (w) => {
        if (w.claims[parcelEntryClaim(game.year)])
          creditBananas(
            w,
            `parcel-refund:${game.year}`,
            100,
            'Pakkeleg aflyst · tilmelding tilbage',
            new Date(),
          )
      })
    return game
  }
  let latest = game
  for (const parcel of game.parcels) {
    if (!parcel.owner || !parcel.openingAt || parcel.openedAt) continue
    const owner = parcel.owner,
      reward = parcel.reward ?? {
        kind: 'bananas' as const,
        amount: parcel.amount,
        title: 'Banangave',
      }
    const id = `parcel-open:${game.year}:${parcel.id}`
    await mutateEconomy(owner, (w) => {
      if (w.parcelRewards?.[id]) return
      if (reward.amount > 0)
        creditBananas(
          w,
          id,
          reward.amount,
          `Pakkeleg · ${reward.title}`,
          new Date(parcel.openingAt!),
        )
      ;(w.parcelRewards ??= {})[id] = {
        year: game.year,
        parcelId: parcel.id,
        reward,
        openedAt: parcel.openingAt!,
      }
    })
    if (reward.kind === 'frame')
      await updateUser(nameKey(owner), (u) => {
        u.frame = `parcel-${game.year}`
      })
    const committed = await mutateParcels(game.year, [], (board) => {
      const p = board.parcels.find((p) => p.id === parcel.id)
      if (p?.owner === owner && p.openingAt) p.openedAt ??= p.openingAt
    })
    latest = committed.game
  }
  return latest
}
/** Preserve awards across seasons; wallet CAS also makes their banana rewards idempotent. */
export async function settleParcelAchievements(
  game: ParcelGame,
  wallets: Record<string, EconomyRecord>,
) {
  const changed: string[] = []
  let context: Awaited<ReturnType<typeof economyContext>> | undefined
  for (const name of game.players) {
    const awards = parcelAwards(game, name)
    const known = wallets[nameKey(name)]?.parcelAchievements ?? {}
    if (Object.keys(awards).every((id) => known[id as keyof typeof awards])) continue
    context ??= await economyContext()
    const { result } = await mutateEconomy(name, (wallet) => {
      const earned = (wallet.parcelAchievements ??= {})
      let added = false
      for (const [id, at] of Object.entries(awards)) {
        const key = id as keyof typeof awards
        if (!earned[key]) {
          earned[key] = at
          added = true
        }
      }
      if (added) settleEconomy(wallet, name, context!, new Date())
      return added
    })
    if (result) changed.push(name)
  }
  return changed
}

export async function parcelRequest(
  name: string | null,
  action?: {
    kind: 'roll' | 'pick' | 'enroll' | 'open'
    day?: unknown
    id?: unknown
    parcel?: unknown
  },
  onBadges?: (names: string[]) => Promise<void>,
) {
  const today = new Date()
  const month = Number(
    new Intl.DateTimeFormat('en', { timeZone: 'Europe/Copenhagen', month: 'numeric' }).format(
      today,
    ),
  )
  const year = Number(
    new Intl.DateTimeFormat('en', { timeZone: 'Europe/Copenhagen', year: 'numeric' }).format(
      new Date(),
    ),
  )
  const eventYear = month < 11 ? year - 1 : year
  if (action?.kind === 'enroll' && name) {
    const context = await economyContext()
    await mutateEconomy(name, (wallet) => {
      settleEconomy(wallet, name, context, new Date())
      payParcelEntry(wallet, eventYear, new Date())
    })
  }
  const [users, wallets] = await Promise.all([listUsers(), allEconomyRecords()])
  const names = users
    .filter((u) => wallets[nameKey(u.name)]?.claims[parcelEntryClaim(eventYear)])
    .map((u) => u.name)
  const die = randomInt(1, 7),
    ticket = randomInt(0x1000000)
  const { game, result: events } = await mutateParcels(eventYear, names, (board) => {
    const now = new Date()
    const before = new Set(board.events.map((e) => e.id))
    prepareParcelRewards(board, now)
    advanceParcels(board, now)
    try {
      if (action?.kind === 'open' && name)
        reserveParcelOpening(board, name, String(action.parcel), now)
      else if (action?.kind === 'roll' && name)
        rollParcel(board, name, String(action.day), String(action.id), die, ticket, now)
      else if (action?.kind === 'pick' && name) {
        if (board.ended || now.getTime() < Date.parse(board.startsAt))
          throw new Error('Pakkelegen er ikke åben.')
        // Lost-response retries of an already committed selection are harmless.
        const saved = Object.values(board.turns[`u:${name}`] ?? {})
          .flat()
          .find((t) => t.id === action.id)
        if (!saved?.parcel) {
          if (board.pending[`u:${name}`]?.id !== action.id)
            throw new Error('Dit valg er udløbet. Hent bordet igen.')
          takeParcel(board, name, String(action.parcel), now)
        }
      }
    } catch (e) {
      throw createError({ statusCode: 409, statusMessage: (e as Error).message })
    }
    return board.events.filter((e) => !before.has(e.id))
  })
  await Promise.allSettled(
    events
      .filter((e) => e.from)
      .map((e) =>
        notifyUser(
          e.from!,
          {
            title: '🎁 Din pakke er blevet stjålet!',
            body: `${e.to} snuppede pakke #${e.parcel.slice(1)} fra dig.`,
            url: '/spil/pakkeleg',
            tag: `parcel-${eventYear}-${e.id}`,
          },
          'parcels',
        ),
      ),
  )
  const settled = await settleParcelPrizes(game)
  const awarded = await settleParcelAchievements(settled, wallets)
  if (awarded.length && onBadges) await onBadges(awarded)
  if (
    settled.ended &&
    !settled.cancelled &&
    Date.now() < Date.parse(settled.endsAt) + 14 * 86400000
  ) {
    for (const player of settled.players) {
      const notice = `parcel-end:${settled.year}`
      if (wallets[nameKey(player)]?.claims[notice]) continue
      const { result: send } = await mutateEconomy(player, (w) => {
        if (w.claims[notice]) return false
        w.claims[notice] = true
        return true
      })
      if (send) {
        const count = settled.parcels.filter((p) => p.owner === player).length
        await notifyUser(
          player,
          {
            title: '🎁 Pakkelegen er slut!',
            body: count
              ? `Du har ${count} pakker. Åbn dem på pakkelegsiden inden 14 dage.`
              : 'Se, hvem der løb med gaverne ved julebordet.',
            url: '/spil/pakkeleg',
            tag: `parcel-end-${settled.year}`,
          },
          'parcels',
        ).catch(() => {})
      }
    }
  }
  return parcelView(settled, name, new Date())
}
