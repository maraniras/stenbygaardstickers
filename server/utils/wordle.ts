import allowed from '../data/wordle-allowed.json'
import { WORDLE_ANSWERS } from '../data/wordle-answers'
import { creditBananas } from './economy'
import { gameDay } from '../../shared/utils/game-day'
import { normalizeWordle, scoreWordle, WORDLE_REWARDS } from '../../shared/utils/wordle'
import type { EconomyRecord } from '../../shared/types/economy'
import type { WordleView } from '../../shared/types/wordle'

const dictionary = new Set([...allowed, ...WORDLE_ANSWERS])
export const wordleAnswers = WORDLE_ANSWERS
export function isWordleWord(word: string) {
  return /^[A-ZÆØÅ]{5}$/.test(word) && dictionary.has(word)
}

export function wordleView(record: EconomyRecord, day: string, answer: string): WordleView {
  const run = record.days[day]?.wordle ?? { guesses: [], finished: false, won: false, reward: 0 }
  return {
    ...run,
    marks: run.guesses.map((guess) => scoreWordle(guess, answer)),
    ...(run.finished ? { answer } : {}),
  }
}

export function applyWordleGuess(
  record: EconomyRecord,
  day: string,
  input: unknown,
  count: number,
  answer: string,
  now = new Date(),
) {
  if (gameDay(now) !== day)
    throw createError({
      statusCode: 409,
      statusMessage: 'Et nyt spildøgn er startet. Hent dagens ord igen.',
    })
  const guess = normalizeWordle(input)
  if (!isWordleWord(guess))
    throw createError({
      statusCode: 400,
      statusMessage: 'Ordet findes ikke i ordlisten. Prøv et andet ord.',
    })
  const existing = record.days[day]?.wordle
  if (existing?.guesses[count] === guess) return // Lost response: retry is never another attempt.
  if ((existing?.guesses.length ?? 0) !== count)
    throw createError({
      statusCode: 409,
      statusMessage: 'Du har et nyere gæt på en anden enhed. Hent spillet igen.',
    })
  if (existing?.finished) return
  if (existing?.guesses.includes(guess))
    throw createError({ statusCode: 400, statusMessage: 'Det ord har du allerede prøvet.' })
  const daily = (record.days[day] ??= {})
  const run = (daily.wordle ??= { guesses: [], finished: false, won: false, reward: 0 })
  run.guesses.push(guess)
  run.won = guess === answer
  run.finished = run.won || run.guesses.length >= 6
  if (run.won) {
    const reward = WORDLE_REWARDS[run.guesses.length - 1]!
    run.reward = creditBananas(
      record,
      `wordle:${day}`,
      reward,
      `Wordle · ${run.guesses.length}. forsøg`,
      now,
    )
      ? reward
      : 0
  }
}
