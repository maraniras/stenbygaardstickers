import { randomInt } from 'node:crypto'
import type { EconomyRecord, DailyResponse, CityRun } from '../../shared/types/economy'
import type { EconomyContext } from './economy'

export function emptyCityRun(): CityRun {
  return { guesses: [], finished: false, won: false, reward: 0 }
}
function trimGameDays(record: EconomyRecord, day: string) {
  const cutoff = Date.parse(`${day}T12:00:00Z`) - 35 * 86400_000
  for (const key of Object.keys(record.days))
    if (Date.parse(`${key}T12:00:00Z`) < cutoff) delete record.days[key]
}
export async function dailyResponse(
  record: EconomyRecord,
  day = gameDay(),
): Promise<DailyResponse> {
  const [challenge, wheelJackpot] = await Promise.all([dailyChallenge(day), dailyWheelJackpot(day)])
  const city = record.days[day]?.city ?? emptyCityRun()
  const wallet = publicEconomy(record)
  // Return current streaks without removing the permanent best streak.
  const previous = previousGameDay(day)
  wallet.stats = {
    ...wallet.stats,
    cityStreak:
      wallet.stats.lastCityWinDay && wallet.stats.lastCityWinDay >= previous
        ? wallet.stats.cityStreak
        : 0,
    wheelStreak:
      wallet.stats.lastWheelDay && wallet.stats.lastWheelDay >= previous
        ? wallet.stats.wheelStreak
        : 0,
  }
  return {
    day,
    nextResetAt: nextGameReset(),
    wallet,
    history: record.history.map((entry) =>
      entry.id === 'badge:jack-dealer-bust'
        ? { ...entry, label: 'Badge · Dealeren gik over' }
        : entry,
    ),
    wheelJackpot,
    city: {
      ...city,
      options: challenge.options.map((c) => ({ id: c.id, name: c.name })),
      ...(city.finished
        ? {
            answer: {
              id: challenge.answer.id,
              name: challenge.answer.name,
              countryCode: challenge.answer.id,
              country:
                new Intl.DisplayNames(['da'], { type: 'region' }).of(challenge.answer.id) ??
                challenge.answer.id,
            },
          }
        : {}),
    },
    wheel: record.days[day]?.wheel ?? null,
  }
}
export function applyCityGuess(
  record: EconomyRecord,
  day: string,
  choice: string,
  correct: string,
  name: string,
  context: EconomyContext,
  now = new Date(),
) {
  if (gameDay(now) !== day)
    throw createError({
      statusCode: 409,
      statusMessage: 'Et nyt spildøgn er startet. Hent dagens spil igen.',
    })
  const daily = (record.days[day] ??= {})
  const run = (daily.city ??= emptyCityRun())
  if (run.finished || run.guesses.includes(choice)) return
  run.guesses.push(choice)
  run.won = choice === correct
  run.finished = run.won || run.guesses.length >= 5
  if (run.finished) {
    if (run.won) {
      run.reward = CITY_REWARDS[run.guesses.length - 1]!
      const stats = record.stats
      stats.cityWins++
      if (run.guesses.length === 1) stats.cityFirstWins++
      if (run.guesses.length === 5) stats.cityLastWins++
      stats.cityStreak = stats.lastCityWinDay === previousGameDay(day) ? stats.cityStreak + 1 : 1
      stats.bestCityStreak = Math.max(stats.bestCityStreak, stats.cityStreak)
      stats.lastCityWinDay = day
      creditBananas(
        record,
        `city:${day}`,
        run.reward,
        `Emil er faret vild · ${run.guesses.length}. gæt`,
        now,
      )
    } else record.stats.cityStreak = 0
    settleEconomy(record, name, context, now)
  }
  trimGameDays(record, day)
}
export function applyWheelSpin(
  record: EconomyRecord,
  day: string,
  name: string,
  context: EconomyContext,
  now = new Date(),
  ticket = () => randomInt(10000),
  jackpot = 500,
) {
  if (gameDay(now) !== day)
    throw createError({
      statusCode: 409,
      statusMessage: 'Et nyt spildøgn er startet. Hent dagens spil igen.',
    })
  const daily = (record.days[day] ??= {})
  if (daily.wheel) return
  const prize = wheelPrizeFor(ticket(), jackpot)
  const isJackpot = prize === jackpot
  daily.wheel = { prize, jackpot: isJackpot, jackpotAmount: jackpot }
  const stats = record.stats
  stats.wheelSpins++
  stats.wheelStreak = stats.lastWheelDay === previousGameDay(day) ? stats.wheelStreak + 1 : 1
  stats.bestWheelStreak = Math.max(stats.bestWheelStreak, stats.wheelStreak)
  stats.lastWheelDay = day
  if (isJackpot) stats.wheelJackpots++
  stats.nitStreak = prize === 0 ? stats.nitStreak + 1 : 0
  stats.bestNitStreak = Math.max(stats.bestNitStreak, stats.nitStreak)
  if (prize)
    creditBananas(
      record,
      `wheel:${day}`,
      prize,
      isJackpot ? 'Lykkehjulet · jackpot!' : 'Dagens lykkehjul',
      now,
    )
  settleEconomy(record, name, context, now)
  trimGameDays(record, day)
}
