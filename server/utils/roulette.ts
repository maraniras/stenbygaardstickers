import { createHash, createHmac } from 'node:crypto'
import type { EconomyRecord } from '../../shared/types/economy'
import type {
  RouletteBet,
  RouletteNumber,
  RouletteRecord,
  RouletteRequest,
  RouletteView,
} from '../../shared/types/roulette'
import {
  ROULETTE_NUMBERS,
  ROULETTE_MAX_BET,
  emptyRouletteStats,
  validRouletteSpot,
  roulettePayout,
  rouletteMultiplier,
  ROULETTE_ROUND_MS,
  ROULETTE_LOCK_MS,
  ROULETTE_REVEAL_MS,
} from '../../shared/utils/roulette'
import { casinoDailyLimit, prepareCasinoDay, recordCasinoResult } from './casino-limit'

const ROUND_MS = ROULETTE_ROUND_MS
const LOCK_MS = ROULETTE_LOCK_MS
const REVEAL_MS = ROULETTE_REVEAL_MS
export const rouletteRoundId = (now = new Date()) => Math.floor(now.getTime() / ROUND_MS)
export const rouletteLocksAt = (round: number) => round * ROUND_MS + LOCK_MS
export const rouletteRevealsAt = (round: number) => round * ROUND_MS + REVEAL_MS
/** Pending wagers from the old minute cadence keep their original result and deadline. */
export const roulettePendingRevealsAt = (pending: NonNullable<RouletteRecord['pending']>) =>
  pending.roundMs === ROUND_MS ? rouletteRevealsAt(pending.round) : pending.round * 60_000 + 55_000

/** Rejection sampling avoids modulo bias. Secret is never returned to clients. */
export function rouletteNumber(round: number, secret: string): RouletteNumber {
  for (let counter = 0; ; counter++) {
    const hash = createHmac('sha256', secret).update(`roulette-v1:${round}:${counter}`).digest()
    for (let offset = 0; offset < hash.length; offset += 4) {
      const value = hash.readUInt32BE(offset)
      if (value < Math.floor(2 ** 32 / 38) * 38) return ROULETTE_NUMBERS[value % 38]!
    }
  }
}
function game(record: EconomyRecord): RouletteRecord {
  return (record.rouletteGame ??= {
    revision: 0,
    history: [],
    requests: [],
    stats: emptyRouletteStats(),
  })
}
export function cleanRouletteRequest(body: unknown): RouletteRequest {
  const value = body as Partial<RouletteRequest> | null
  if (
    !value ||
    typeof value.id !== 'string' ||
    !/^[A-Za-z0-9_-]{16,80}$/.test(value.id) ||
    !Number.isSafeInteger(value.round) ||
    value.round! < 0 ||
    !Number.isSafeInteger(value.revision) ||
    value.revision! < 0 ||
    !Array.isArray(value.bets) ||
    value.bets.length > 10
  )
    throw createError({ statusCode: 400, statusMessage: 'Ugyldig rouletteindsats.' })
  const seen = new Set<string>()
  const bets: RouletteBet[] = value.bets
    .map((bet) => {
      if (
        !bet ||
        typeof bet.spot !== 'string' ||
        !validRouletteSpot(bet.spot) ||
        seen.has(bet.spot) ||
        !Number.isSafeInteger(bet.amount) ||
        bet.amount < 5 ||
        bet.amount > ROULETTE_MAX_BET ||
        bet.amount % 5
      )
        throw createError({
          statusCode: 400,
          statusMessage: 'Brug jetoner på mindst 5 og højst 50 bananer pr. felt.',
        })
      seen.add(bet.spot)
      return { spot: bet.spot, amount: bet.amount }
    })
    .sort((a, b) => a.spot.localeCompare(b.spot))
  if (bets.reduce((sum, bet) => sum + bet.amount, 0) > ROULETTE_MAX_BET)
    throw createError({
      statusCode: 400,
      statusMessage: 'Du kan højst sætte 50 bananer i alt pr. runde.',
    })
  return { id: value.id, round: value.round!, revision: value.revision!, bets }
}
function fingerprint(request: RouletteRequest) {
  return createHash('sha256')
    .update(JSON.stringify([request.round, request.revision, request.bets]))
    .digest('hex')
}
export function rouletteRequestSaved(record: EconomyRecord | undefined, request: RouletteRequest) {
  const saved = record?.rouletteGame?.requests.find((item) => item.id === request.id)
  if (!saved) return false
  if (saved.fingerprint !== fingerprint(request))
    throw createError({
      statusCode: 409,
      statusMessage: 'Denne indsats er allerede gemt med andre felter.',
    })
  return true
}
export function placeRouletteBets(
  record: EconomyRecord,
  request: RouletteRequest,
  now = new Date(),
) {
  if (rouletteRequestSaved(record, request)) return
  if (request.round !== rouletteRoundId(now) || now.getTime() >= rouletteLocksAt(request.round))
    throw createError({
      statusCode: 409,
      statusMessage: 'Indsatserne er låst. Vent på næste runde.',
    })
  const current = game(record)
  if (request.revision !== current.revision)
    throw createError({
      statusCode: 409,
      statusMessage: 'Dine indsatser er ændret fra en anden enhed. Bordet opdateres.',
    })
  if (current.pending && current.pending.round !== request.round)
    throw createError({ statusCode: 409, statusMessage: 'Den forrige runde skal afregnes først.' })
  const total = request.bets.reduce((sum, bet) => sum + bet.amount, 0)
  const previous = current.pending?.total ?? 0
  const additional = total - previous
  if (additional > record.balance)
    throw createError({ statusCode: 400, statusMessage: 'Du har ikke nok bananer til indsatsen.' })
  if (additional > casinoDailyLimit(record, now).remaining)
    throw createError({
      statusCode: 409,
      statusMessage: 'Indsatsen overstiger din fælles casinogrænse.',
    })
  prepareCasinoDay(record, now)
  current.revision++
  current.pending = {
    round: request.round,
    bets: request.bets.map((bet) => ({ ...bet })),
    total,
    roundMs: ROUND_MS,
  }
  record.balance -= additional
  record.peakBalance = Math.max(record.peakBalance, record.balance)
  if (additional)
    record.history.unshift({
      id: `roulette:${request.round}:${current.revision}:stake`,
      amount: -additional,
      label: additional > 0 ? 'Roulette · indsats' : 'Roulette · indsats tilbage',
      at: now.toISOString(),
    })
  record.history = record.history.slice(0, 250)
  current.requests.unshift({ id: request.id, fingerprint: fingerprint(request) })
  current.requests = current.requests.slice(0, 24)
}

/** Runs inside the wallet CAS before any other wallet mutation, including other casino games. */
export async function settleRouletteRecord(
  record: EconomyRecord,
  now = new Date(),
  suppliedSecret?: string,
) {
  const current = record.rouletteGame
  const pending = current?.pending
  if (!current || !pending || now.getTime() < roulettePendingRevealsAt(pending)) return false
  const at = new Date(roulettePendingRevealsAt(pending))
  if (pending.total > 0) {
    const number = rouletteNumber(pending.round, suppliedSecret ?? (await gameSecret()))
    const payout = roulettePayout(pending.bets, number)
    const net = payout - pending.total
    if (!Number.isSafeInteger(record.balance + payout)) throw new Error('Invalid roulette balance')
    record.balance += payout
    record.peakBalance = Math.max(record.peakBalance, record.balance)
    if (payout)
      record.history.unshift({
        id: `roulette:${pending.round}:payout`,
        amount: payout,
        label: `Roulette · ${number}`,
        at: at.toISOString(),
      })
    const stats = current.stats
    if (
      (number === '0' || number === '00') &&
      pending.bets.some((bet) => bet.spot === `n:${number}`)
    )
      stats.zeroWins = (stats.zeroWins ?? 0) + 1
    const colourWin =
      pending.bets.some(
        (bet) =>
          (bet.spot === 'red' || bet.spot === 'black') && rouletteMultiplier(bet.spot, number),
      ) && net > 0
    stats.colourStreak = colourWin ? (stats.colourStreak ?? 0) + 1 : 0
    stats.bestColourStreak = Math.max(stats.bestColourStreak ?? 0, stats.colourStreak)
    stats.rounds++
    if (net > 0) stats.wins++
    if (
      pending.bets.some((bet) => bet.spot.startsWith('n:') && rouletteMultiplier(bet.spot, number))
    )
      stats.straightWins++
    stats.totalStaked += pending.total
    stats.totalPaid += payout
    stats.net += net
    stats.biggestWin = Math.max(stats.biggestWin, net)
    current.history.unshift({
      round: pending.round,
      number,
      bets: pending.bets,
      stake: pending.total,
      payout,
      net,
      at: at.toISOString(),
    })
    current.history = current.history.slice(0, 10)
    recordCasinoResult(record, -net, at)
    record.history = record.history.slice(0, 250)
  }
  delete current.pending
  return true
}

const PLAYER_CAS = `local previous = redis.call('HGET', KEYS[1], ARGV[1])
if previous and cjson.decode(previous).revision > tonumber(ARGV[3]) then return 0 end
redis.call('HSET', KEYS[1], ARGV[1], ARGV[2]); redis.call('EXPIRE', KEYS[1], 172800); return 1`
const localPlayerTails = new Map<string, Promise<void>>()
export async function mirrorRoulettePlayer(name: string, record: EconomyRecord) {
  const pending = record.rouletteGame?.pending
  if (!pending) return
  const key = `roulette:players:${pending.round}`
  const player = {
    name,
    bets: pending.bets,
    total: pending.total,
    revision: record.rouletteGame!.revision,
  }
  if (redisEnabled) {
    await redisEval(
      PLAYER_CAS,
      [key],
      [nameKey(name), JSON.stringify(player), String(player.revision)],
    )
    return
  }
  const previous = localPlayerTails.get(key) ?? Promise.resolve()
  const work = previous
    .catch(() => {})
    .then(async () => {
      const store = useStorage('data')
      const players = (await store.getItem<Record<string, typeof player>>(key)) ?? {}
      if ((players[nameKey(name)]?.revision ?? -1) <= player.revision) {
        players[nameKey(name)] = player
        await store.setItem(key, players)
      }
    })
  localPlayerTails.set(key, work)
  try {
    await work
  } finally {
    if (localPlayerTails.get(key) === work) localPlayerTails.delete(key)
  }
}
async function roulettePlayers(round: number): Promise<RouletteView['players']> {
  const key = `roulette:players:${round}`
  const values = redisEnabled
    ? ((await redis([['HVALS', key]]))[0] as string[]).map((value) => JSON.parse(value))
    : Object.values((await useStorage('data').getItem<Record<string, unknown>>(key)) ?? {})
  return values
    .filter(
      (value): value is RouletteView['players'][number] =>
        !!value && typeof value === 'object' && 'total' in value && Number(value.total) > 0,
    )
    .map(({ name, bets, total }) => ({ name, bets, total }))
    .sort((a, b) => a.name.localeCompare(b.name, 'da'))
}
export async function rouletteView(
  name?: string,
  onSettled?: () => Promise<void>,
): Promise<RouletteView> {
  const secret = await gameSecret()
  let record = name ? await readEconomy(name) : undefined
  if (name && !record) record = await syncEconomy(name)
  if (
    name &&
    record?.rouletteGame?.pending &&
    Date.now() >= roulettePendingRevealsAt(record.rouletteGame.pending)
  ) {
    record = await syncEconomy(name)
    await onSettled?.()
  }
  const now = new Date()
  const id = rouletteRoundId(now)
  const elapsed = now.getTime() - id * ROUND_MS
  const phase = elapsed < LOCK_MS ? 'betting' : elapsed < REVEAL_MS ? 'spinning' : 'result'
  const players = await roulettePlayers(id)
  const pending = record?.rouletteGame?.pending
  const last = record?.rouletteGame?.history[0]
  return {
    serverTime: now.toISOString(),
    round: {
      id,
      startsAt: new Date(id * ROUND_MS).toISOString(),
      locksAt: new Date(rouletteLocksAt(id)).toISOString(),
      revealsAt: new Date(rouletteRevealsAt(id)).toISOString(),
      endsAt: new Date((id + 1) * ROUND_MS).toISOString(),
      phase,
      ...(phase === 'result' ? { result: rouletteNumber(id, secret) } : {}),
    },
    recent: Array.from({ length: 10 }, (_, index) => ({
      round: id - 1 - index,
      number: rouletteNumber(id - 1 - index, secret),
    })),
    players,
    ...(record
      ? {
          me: {
            balance: record.balance,
            revision: record.rouletteGame?.revision ?? 0,
            bets: pending?.round === id ? pending.bets : last?.round === id ? last.bets : [],
            total: pending?.round === id ? pending.total : last?.round === id ? last.stake : 0,
            limit: casinoDailyLimit(record, now),
            last,
            stats: record.rouletteGame?.stats ?? emptyRouletteStats(),
          },
        }
      : {}),
  }
}
