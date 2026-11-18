import type { EconomyRecord } from '../../shared/types/economy'
import { emptyWordleStats } from '../../shared/utils/wordle-badges'
import { gameDay, previousGameDay } from '../../shared/utils/game-day'

/** Import retained games once; all future counters survive the 35-day game pruning. */
export function syncWordleStats(record: EconomyRecord) {
  const days = Object.entries(record.days)
    .filter(([, games]) => games.wordle?.guesses.length)
    .sort(([a], [b]) => a.localeCompare(b))
  if (!days.length) return
  const stats = (record.wordleStats ??= { ...emptyWordleStats(), counted: {} })
  for (const [day, games] of days) {
    const run = games.wordle!
    if (!(day in stats.counted)) stats.counted[day] = 0
    if (stats.counted[day] !== 0 || !run.finished) continue
    stats.counted[day] = run.won ? run.guesses.length : -1
    stats.played++
    if (!run.won) continue
    stats.wins++
    stats.firstWins += Number(run.guesses.length === 1)
    stats.lastWins += Number(run.guesses.length === 6)
    stats.quickWins += Number(run.guesses.length <= 3)
    stats.winningGuesses += run.guesses.length
    stats.distribution[run.guesses.length - 1] =
      (stats.distribution[run.guesses.length - 1] ?? 0) + 1
    stats.bananas += run.reward
  }
  // Recompute from compact day outcomes to handle unfinished/skipped days and migrations.
  let streak = 0,
    lastWin: string | undefined
  for (const [day, outcome] of Object.entries(stats.counted).sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    if (outcome === 0) continue
    if (outcome < 0) {
      streak = 0
      continue
    }
    streak = lastWin === previousGameDay(day) ? streak + 1 : 1
    lastWin = day
    stats.bestStreak = Math.max(stats.bestStreak, streak)
  }
  stats.streak = streak
  stats.lastWinDay = lastWin
}
export function publicWordleStats(record: EconomyRecord, now = new Date()) {
  if (!record.wordleStats) return undefined
  const { counted: _, ...stats } = record.wordleStats
  return {
    ...stats,
    distribution: [...stats.distribution],
    streak:
      stats.lastWinDay && stats.lastWinDay >= previousGameDay(gameDay(now)) ? stats.streak : 0,
  }
}
