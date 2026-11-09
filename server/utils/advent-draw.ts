import { createHmac, randomBytes } from 'node:crypto'
import type { AdventPrize, AdventReward } from '../../shared/types/advent'
import { ADVENT_YEAR, type AdventPrizeConfig } from '../data/advent'
import { ADVENT_REWARDS } from '../../shared/utils/advent-rewards'

const DRAW_KEY = `advent:${ADVENT_YEAR}:draw`
export const ADVENT_CUTOFF = '2026-11-30T23:00:00.000Z' // 1 December 00:00 Copenhagen
interface Award {
  reward: AdventReward
  winner: string
  day: number
}
export interface AdventDraw {
  year: number
  createdAt: string
  cutoff: string
  seed: string
  participants: string[]
  awards: Award[]
  catalog: Record<AdventReward, AdventPrize>
  plans: Record<string, AdventPrizeConfig[]>
}
function randomFor(seed: string, scope: string) {
  let counter = 0
  return (max: number) => {
    const limit = Math.floor(0x100000000 / max) * max
    let value: number
    do {
      value = createHmac('sha256', seed).update(`${scope}:${counter++}`).digest().readUInt32BE(0)
    } while (value >= limit)
    return value % max
  }
}
export function buildAdventPlan(name: string, draw: AdventDraw): AdventPrizeConfig[] {
  const random = randomFor(draw.seed, `person:${nameKey(name)}`)
  const rewards: AdventReward[] = Array.from({ length: 24 }, () => {
    const n = random(100)
    return n < 55 ? 'banana-single' : n < 90 ? 'banana-small' : 'banana-large'
  })
  const free = Array.from({ length: 24 }, (_, i) => i)
  const place = (reward: AdventReward, count: number) => {
    for (let i = 0; i < count; i++) rewards[free.splice(random(free.length), 1)[0]!] = reward
  }
  const elfRoll = random(100)
  place(
    'elf',
    nameKey(name) === 'norsk'
      ? 7
      : elfRoll < 15
        ? 1
        : elfRoll < 55
          ? 2
          : elfRoll < 85
            ? 3
            : elfRoll < 95
              ? 4
              : 5,
  )
  place('friend-gift', 1 + random(3))
  place('self-gift', 1 + random(3))
  place('banana-large', 2)
  const plan = rewards.map((reward, i) => ({
    day: i + 1,
    published: true,
    prize: structuredClone(draw.catalog[reward]),
  }))
  for (const award of draw.awards.filter((a) => sameName(a.winner, name))) {
    const entry = plan[award.day - 1]!
    const extra = structuredClone(draw.catalog[award.reward])
    // Replace ordinary bananas, but never remove a guaranteed elf/gift.
    if (entry.prize.reward === 'banana-single' || entry.prize.reward === 'banana-small')
      entry.prize = extra
    else {
      const bundled = entry as AdventPrizeConfig & { extras?: AdventPrize[] }
      ;(bundled.extras ??= []).push(extra)
    }
  }
  return plan
}
export function createAdventDraw(
  users: { name: string; createdAt: string }[],
  seed: string,
  now = new Date(),
): AdventDraw {
  if (now.getTime() < Date.parse(ADVENT_CUTOFF)) throw Error('Deltagerlisten er ikke lukket endnu')
  const participants = [
    ...new Map(
      users
        .filter((u) => Date.parse(u.createdAt) < Date.parse(ADVENT_CUTOFF))
        .map((u) => [nameKey(u.name), u.name]),
    ).values(),
  ].sort((a, b) => a.localeCompare(b, 'da'))
  const random = randomFor(seed, 'awards')
  const eligible = participants.filter((n) => !['mathias', 'tobias frost'].includes(nameKey(n)))
  const awards: Award[] = []
  for (const reward of [
    'mix-max',
    'mix-max',
    'mix-max',
    'mix-max',
    'mix-max',
    'red-wine',
    'white-wine',
    'cycling-bottle',
    'cycling-bottle',
    'santa',
  ] as AdventReward[]) {
    const pool = eligible.filter((n) => reward !== 'cycling-bottle' || nameKey(n) !== 'emil')
    if (!pool.length) continue
    awards.push({
      reward,
      winner: pool[random(pool.length)]!,
      day: reward === 'red-wine' || reward === 'white-wine' ? 23 + random(2) : 1 + random(24),
    })
  }
  const draw: AdventDraw = {
    year: ADVENT_YEAR,
    createdAt: now.toISOString(),
    cutoff: ADVENT_CUTOFF,
    seed,
    participants,
    awards,
    catalog: structuredClone(ADVENT_REWARDS),
    plans: {},
  }
  draw.plans = Object.fromEntries(
    participants.map((name) => [nameKey(name), buildAdventPlan(name, draw)]),
  )
  return draw
}
export async function readAdventDraw(): Promise<AdventDraw | undefined> {
  const raw = redisEnabled
    ? ((await redis([['GET', DRAW_KEY]])) as [string | null])[0]
    : await useStorage('data').getItem<AdventDraw | string>(DRAW_KEY)
  return raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : undefined
}
let creating: Promise<AdventDraw> | undefined
export async function ensureAdventDraw(now = new Date()): Promise<AdventDraw | undefined> {
  if (now.getTime() < Date.parse(ADVENT_CUTOFF)) return undefined
  const saved = await readAdventDraw()
  if (saved) return saved
  creating ??= (async () => {
    const existing = await readAdventDraw()
    if (existing) return existing
    const candidate = createAdventDraw(await listUsers(), randomBytes(32).toString('hex'), now)
    if (redisEnabled) {
      await redis([['SET', DRAW_KEY, JSON.stringify(candidate), 'NX']])
      const committed = await readAdventDraw()
      if (!committed) throw Error('Lodtrækningen kunne ikke gemmes')
      return committed
    }
    await useStorage('data').setItem(DRAW_KEY, candidate)
    return candidate
  })().finally(() => {
    creating = undefined
  })
  return creating
}
export async function adventConfigsFor(
  name: string,
  now = new Date(),
): Promise<AdventPrizeConfig[] | undefined> {
  const draw = await ensureAdventDraw(now)
  if (!draw) return undefined
  const saved = draw.plans[nameKey(name)]
  if (Array.isArray(saved)) return saved
  // Later accounts have personal bananas/gifts, but no limited-stock awards.
  const { record } = await mutateEconomy(name, (wallet) => {
    const plans = (wallet.adventPlans ??= {})
    plans[String(ADVENT_YEAR)] ??= buildAdventPlan(name, draw)
  })
  return record.adventPlans![String(ADVENT_YEAR)]
}
