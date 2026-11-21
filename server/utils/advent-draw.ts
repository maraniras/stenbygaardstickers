import { createHmac, randomBytes } from 'node:crypto'
import type { AdventPrize, AdventReward } from '../../shared/types/advent'
import { ADVENT_YEAR, type AdventPrizeConfig } from '../data/advent'
import { ADVENT_REWARDS } from '../../shared/utils/advent-rewards'
import { readCrossword } from './crossword'
import type { CrosswordState } from '../../shared/types/crossword'

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
  // Reserve limited prizes first, so guaranteed gifts/nisses never share a door.
  for (const award of draw.awards.filter((a) => sameName(a.winner, name))) {
    const index = free.indexOf(award.day - 1)
    if (index < 0) throw Error('To præmier kan ikke ligge i samme låge')
    free.splice(index, 1)
    rewards[award.day - 1] = award.reward
  }
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
  let friendGifts = 1 + random(3)
  let selfGifts = 1 + random(3)
  // Keep two large piles and at least one of each gift even in prize-heavy calendars.
  while (friendGifts + selfGifts + 2 > free.length) {
    if (friendGifts > 1 && (selfGifts === 1 || random(2) === 0)) friendGifts--
    else if (selfGifts > 1) selfGifts--
    else throw Error('Kalenderen har ikke plads til de garanterede fund')
  }
  place('friend-gift', friendGifts)
  place('self-gift', selfGifts)
  place('banana-large', 2)
  const plan = rewards.map((reward, i) => ({
    day: i + 1,
    published: true,
    prize: structuredClone(draw.catalog[reward]),
  }))
  return plan
}

function assignAwardDays(awards: Award[], seed: string) {
  const random = randomFor(seed, 'award-days')
  const daysFor = (award: Award) => {
    if (award.reward === 'red-wine' || award.reward === 'white-wine') return [24]
    if (award.reward === 'juleskum') return [3]
    if (award.reward === 'snowglobe') return [1, 2, 3, 4, 5, 6]
    if (award.reward === 'vampiri' && nameKey(award.winner) === 'norsk') return [18]
    if (award.reward === 'vampiri') return Array.from({ length: 10 }, (_, i) => i + 7)
    if (award.reward === 'cake') return Array.from({ length: 9 }, (_, i) => i + 10)
    return Array.from({ length: 24 }, (_, i) => i + 1)
  }
  const reserved = new Map<string, Set<number>>()
  // Fixed dates and restricted periods take precedence over flexible physical gifts.
  const ordered = [...awards].sort(
    (a, b) =>
      daysFor(a).length - daysFor(b).length ||
      Number(ADVENT_REWARDS[b.reward].kind === 'physical') -
        Number(ADVENT_REWARDS[a.reward].kind === 'physical'),
  )
  for (const award of ordered) {
    const key = nameKey(award.winner)
    const used = reserved.get(key) ?? new Set<number>()
    reserved.set(key, used)
    const available = daysFor(award).filter((day) => !used.has(day))
    if (!available.length) throw Error('Præmierne kan ikke fordeles uden lågeoverlap')
    award.day =
      ADVENT_REWARDS[award.reward].kind === 'physical' && available.includes(24)
        ? 24
        : available[random(available.length)]!
    used.add(award.day)
  }
}
export function createAdventDraw(
  users: { name: string; createdAt: string }[],
  seed: string,
  now = new Date(),
  crosswordWinner: CrosswordState['winner'] = null,
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
  const mugExcluded =
    crosswordWinner && Date.parse(crosswordWinner.at) <= now.getTime() ? crosswordWinner.name : null
  const eligible = participants.filter(
    (n) => !['mathias', 'tobias frost', 'frederik prip', 'strandsbjerg'].includes(nameKey(n)),
  )
  const guaranteedMixMax = eligible.flatMap((n) =>
    nameKey(n) === 'norsk' ? [n, n] : nameKey(n) === 'emil' ? [n] : [],
  )
  const winePool = eligible.filter((n) =>
    ['nicole', 'norsk', 'emil', 'morten', 'anna'].includes(nameKey(n)),
  )
  const awards: Award[] = []
  for (const reward of [
    'mix-max',
    'mix-max',
    'mix-max',
    'mix-max',
    'mix-max',
    'red-wine',
    'white-wine',
    'uno-x-bottle',
    'visma-bottle',
    'snowglobe',
    'faxe-kondi',
    'faxe-kondi',
    'juleskum',
    'rta-mug',
    'santa',
  ] as AdventReward[]) {
    let pool =
      reward === 'uno-x-bottle' || reward === 'visma-bottle'
        ? participants.filter(
            (n) =>
              !['tobias frost', 'emil', 'strandsbjerg'].includes(nameKey(n)) &&
              !(reward === 'uno-x-bottle' && nameKey(n) === 'anna'),
          )
        : eligible
    if (reward === 'mix-max') {
      pool = guaranteedMixMax.length
        ? [guaranteedMixMax.shift()!]
        : participants.filter((n) => !['mathias', 'tobias frost'].includes(nameKey(n)))
    }
    if (reward === 'juleskum') pool = eligible.filter((n) => nameKey(n) === 'anna')
    if (reward === 'faxe-kondi')
      pool = eligible.filter((n) => ['ida', 'anna', 'morten', 'emil'].includes(nameKey(n)))
    if (reward === 'rta-mug')
      pool = eligible.filter(
        (n) =>
          ['anna', 'emil', 'morten', 'nicolas', 'nicole', 'norsk'].includes(nameKey(n)) &&
          !(mugExcluded && sameName(n, mugExcluded)),
      )
    if (reward === 'red-wine' || reward === 'white-wine') {
      const previous = awards.find((a) => a.reward === 'red-wine' || a.reward === 'white-wine')
      pool = winePool.filter((n) => {
        if (previous && sameName(n, previous.winner)) return false
        const pair = [nameKey(n), previous ? nameKey(previous.winner) : '']
        return !(pair.includes('nicole') && pair.includes('norsk'))
      })
    }
    if (!pool.length) continue
    awards.push({
      reward,
      winner: pool[random(pool.length)]!,
      day: 0,
    })
  }
  // One optional prize shared by Ida and Marc, never one per participant.
  const cakePool = participants.filter((name) => ['ida', 'marc'].includes(nameKey(name)))
  if (cakePool.length)
    awards.push({ reward: 'cake', winner: cakePool[random(cakePool.length)]!, day: 0 })
  const anna = participants.find((name) => nameKey(name) === 'anna')
  // Named Vampiri prizes still require an account created before the roster cutoff.
  if (anna) awards.push({ reward: 'vampiri', winner: anna, day: 0 })
  const norsk = participants.find((name) => nameKey(name) === 'norsk')
  if (norsk) awards.push({ reward: 'vampiri', winner: norsk, day: 18 })
  assignAwardDays(awards, seed)
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
    const [users, crossword] = await Promise.all([listUsers(), readCrossword()])
    const candidate = createAdventDraw(
      users,
      randomBytes(32).toString('hex'),
      now,
      crossword.winner,
    )
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
