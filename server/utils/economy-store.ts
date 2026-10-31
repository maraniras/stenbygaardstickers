import type { EconomyRecord, EconomyPublic } from '../../shared/types/economy'
import { emptyDailyStats } from '../../shared/utils/economy'
import { publicJackStats } from './jack-stats'

export const ECONOMY_CAS = `if (redis.call('HGET', KEYS[1], ARGV[1]) or '') ~= ARGV[2] then return 0 end
redis.call('HSET', KEYS[1], ARGV[1], ARGV[3]); return 1`
const localQueues = new Map<string, Promise<void>>()
export function freshEconomy(): EconomyRecord {
  return {
    version: 1,
    balance: 0,
    peakBalance: 0,
    stats: emptyDailyStats(),
    milestones: {},
    claims: {},
    history: [],
    days: {},
  }
}
async function economyRaw(key: string) {
  if (!redisEnabled) {
    // unstorage's filesystem driver automatically deserializes JSON strings.
    const value = await useStorage('data').getItem<string | EconomyRecord>(
      `economy:${encodeURIComponent(key)}`,
    )
    return value ? (typeof value === 'string' ? value : JSON.stringify(value)) : ''
  }
  const [value] = (await redis([['HGET', 'economy', key]])) as [string | null]
  return value ?? ''
}
export async function readEconomy(name: string): Promise<EconomyRecord | undefined> {
  const key = nameKey(name)
  if (!redisEnabled) await localQueues.get(key)
  const raw = await economyRaw(key)
  return raw ? JSON.parse(raw) : undefined
}
/** Every credit + claim + game outcome commits in one compare-and-set. */
export async function mutateEconomy<T>(
  name: string,
  change: (record: EconomyRecord) => T,
): Promise<{ record: EconomyRecord; result: T }> {
  const key = nameKey(name)
  if (!redisEnabled) {
    const previous = localQueues.get(key) ?? Promise.resolve()
    let release = () => {}
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    const tail = previous.then(() => gate)
    localQueues.set(key, tail)
    await previous
    try {
      const raw = await economyRaw(key)
      const record: EconomyRecord = raw ? JSON.parse(raw) : freshEconomy()
      const result = change(record)
      await useStorage('data').setItem(`economy:${encodeURIComponent(key)}`, JSON.stringify(record))
      return { record, result }
    } finally {
      release()
      if (localQueues.get(key) === tail) localQueues.delete(key)
    }
  }
  for (let attempt = 0; attempt < 16; attempt++) {
    const raw = await economyRaw(key)
    const record: EconomyRecord = raw ? JSON.parse(raw) : freshEconomy()
    const result = change(record)
    if ((await redisEval(ECONOMY_CAS, ['economy'], [key, raw, JSON.stringify(record)])) === 1)
      return { record, result }
    await new Promise((resolve) => setTimeout(resolve, 5 + attempt * 2))
  }
  throw createError({
    statusCode: 409,
    statusMessage: 'Saldoen blev opdateret fra en anden enhed. Prøv igen.',
  })
}
export function publicEconomy(record: EconomyRecord): EconomyPublic {
  return {
    balance: record.balance,
    peakBalance: record.peakBalance,
    stats: record.stats,
    milestones: record.milestones,
    jack: publicJackStats(record),
  }
}
export async function allEconomyRecords(): Promise<Record<string, EconomyRecord>> {
  if (!redisEnabled) {
    const storage = useStorage('data')
    const keys = await storage.getKeys('economy:')
    const entries = await Promise.all(
      keys.map(async (key) => {
        const name = decodeURIComponent(key.slice('economy:'.length))
        return [name, await readEconomy(name)] as const
      }),
    )
    return Object.fromEntries(
      entries.filter((entry): entry is readonly [string, EconomyRecord] => !!entry[1]),
    )
  }
  const [flat] = (await redis([['HGETALL', 'economy']])) as [string[]]
  const out: Record<string, EconomyRecord> = {}
  for (let i = 0; i < flat.length; i += 2) out[flat[i]!] = JSON.parse(flat[i + 1]!)
  return out
}
