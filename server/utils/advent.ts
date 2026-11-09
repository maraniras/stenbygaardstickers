import type { EconomyRecord } from '../../shared/types/economy'
import type { AdventOpening, AdventResponse } from '../../shared/types/advent'
import { adventAvailableDay, adventUnlockAt } from '../../shared/utils/advent'
import { nextGameReset } from '../../shared/utils/game-day'
import { ADVENT_PRIZES, ADVENT_YEAR, type AdventPrizeConfig } from '../data/advent'
import { adventPrizeAmount } from '../../shared/utils/advent-rewards'

export function adventResponse(
  record?: EconomyRecord,
  now = new Date(),
  configs = ADVENT_PRIZES,
): AdventResponse {
  const availableDay = adventAvailableDay(ADVENT_YEAR, now)
  return {
    year: ADVENT_YEAR,
    serverNow: now.toISOString(),
    nextRefreshAt: nextGameReset(now),
    previewAllowed:
      process.env.VERCEL_ENV !== 'production' &&
      (process.env.NODE_ENV === 'development' || process.env.VERCEL_ENV === 'preview'),
    availableDay,
    doors: configs.map((config) => ({
      day: config.day,
      unlocksAt: adventUnlockAt(ADVENT_YEAR, config.day),
      available: config.day <= availableDay,
      configured: config.published && config.prize !== null,
      opening: record?.advent?.[String(ADVENT_YEAR)]?.[String(config.day)] ?? null,
    })),
  }
}

/** Runs inside the wallet CAS: prize snapshot, balance and opening commit together. */
export function openAdventDoor(
  record: EconomyRecord,
  year: unknown,
  day: unknown,
  now = new Date(),
  configs: AdventPrizeConfig[] = ADVENT_PRIZES,
): AdventOpening {
  if (year !== ADVENT_YEAR || !Number.isInteger(day) || Number(day) < 1 || Number(day) > 24)
    throw createError({ statusCode: 400, statusMessage: 'Ugyldig kalender eller låge.' })
  const key = String(day)
  const saved = record.advent?.[String(year)]?.[key]
  if (saved) return saved
  if (Number(day) > adventAvailableDay(ADVENT_YEAR, now))
    throw createError({
      statusCode: 403,
      statusMessage: 'Lågen åbner først på datoen kl. 04.00 dansk tid.',
    })
  const config = configs.find((item) => item.day === day)
  if (!config?.published || !config.prize)
    throw createError({
      statusCode: 409,
      statusMessage: 'Præmien til denne låge er ikke klar endnu.',
    })
  const prize = structuredClone(config.prize)
  const extras = structuredClone(config.extras ?? [])
  if (
    (prize.kind === 'bananas' || prize.kind === 'friend-gift') &&
    (!Number.isSafeInteger(prize.amount) ||
      (prize.kind === 'friend-gift' && prize.amount <= 0) ||
      !Number.isSafeInteger(record.balance + prize.amount))
  )
    throw createError({ statusCode: 500, statusMessage: 'Lågens præmie er ikke sat korrekt op.' })
  const reward = [prize, ...extras].reduce((sum, p) => sum + adventPrizeAmount(p), 0)
  if (!Number.isSafeInteger(reward) || !Number.isSafeInteger(record.balance + reward))
    throw createError({ statusCode: 500, statusMessage: 'Lågens beløb er ugyldigt.' })
  const amount = Math.max(-record.balance, reward) || 0
  const opening: AdventOpening = {
    day: Number(day),
    openedAt: now.toISOString(),
    prize,
    amount,
    ...(extras.length ? { extras } : {}),
    ...([prize, ...extras].some((p) => p.kind === 'physical')
      ? { fulfilment: 'pending' as const }
      : {}),
  }
  const claim = `advent:${year}:${day}`
  record.balance += amount
  record.peakBalance = Math.max(record.peakBalance, record.balance)
  record.claims[claim] = true
  if (amount !== 0) {
    record.history.unshift({
      id: claim,
      amount,
      label: `Julekalender · låge ${day} · ${prize.title}`,
      at: opening.openedAt,
    })
    record.history = record.history.slice(0, 250)
  }
  const years = (record.advent ??= {})
  const openings = (years[String(year)] ??= {})
  openings[key] = opening
  return opening
}
