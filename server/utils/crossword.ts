import type {
  CrosswordHelp,
  CrosswordLeaderboard,
  CrosswordState,
  CrosswordView,
} from '../../shared/types/crossword'
import { createHash } from 'node:crypto'
import {
  crosswordOpen,
  crosswordOpeningTime,
  crosswordHelpAt,
  CROSSWORD_PRIZE,
} from '../../shared/utils/crossword'
import { gameDay, nextGameReset } from '../../shared/utils/game-day'
import { CROSSWORD_PREVIEW, CROSSWORD_COLUMNS, CROSSWORD_ROWS } from '../data/crossword'

const STORE = 'crossword-games'
const ID = '1'
const REVISION = createHash('sha256')
  .update(JSON.stringify(CROSSWORD_PREVIEW))
  .digest('hex')
  .slice(0, 16)
const CAS = `if (redis.call('HGET', KEYS[1], ARGV[1]) or '') ~= ARGV[2] then return 0 end
redis.call('HSET', KEYS[1], ARGV[1], ARGV[3]); return 1`
let localTail = Promise.resolve()
export function freshCrossword(): CrosswordState {
  return { opensAt: null, winner: null, finished: {}, attempts: {} }
}
async function rawCrossword() {
  if (redisEnabled) return ((await redis([['HGET', STORE, ID]]))[0] as string | null) || ''
  const value = await useStorage('data').getItem<string | CrosswordState>(`${STORE}:${ID}`)
  return value ? (typeof value === 'string' ? value : JSON.stringify(value)) : ''
}
export async function readCrossword(): Promise<CrosswordState> {
  const raw = await rawCrossword()
  return raw ? JSON.parse(raw) : freshCrossword()
}
export async function mutateCrossword<T>(change: (state: CrosswordState) => T) {
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
      const raw = await rawCrossword()
      const state: CrosswordState = raw ? JSON.parse(raw) : freshCrossword()
      const result = change(state)
      if (redisEnabled) {
        if ((await redisEval(CAS, [STORE], [ID, raw, JSON.stringify(state)])) !== 1) continue
      } else await useStorage('data').setItem(`${STORE}:${ID}`, JSON.stringify(state))
      return { state, result }
    }
    throw createError({ statusCode: 409, statusMessage: 'Krydsordet blev opdateret. Prøv igen.' })
  } finally {
    release()
  }
}
export function crosswordView(
  state: CrosswordState,
  name?: string,
  preview = false,
  now = new Date(),
): CrosswordView {
  const open = crosswordOpen(state, now)
  const helpAt = crosswordHelpAt(state)
  return {
    id: ID,
    opensAt: state.opensAt,
    open,
    preview,
    winner: state.winner,
    completed: !!(name && state.finished[`u:${nameKey(name)}`]),
    helpAt,
    helpAvailable: !!(open && helpAt && Date.parse(helpAt) <= now.getTime()),
    ...(open || preview
      ? {
          puzzle: {
            revision: REVISION,
            columns: CROSSWORD_COLUMNS,
            rows: CROSSWORD_ROWS,
            entries: CROSSWORD_PREVIEW.map(({ answer, ...entry }) => ({
              ...entry,
              length: answer.length,
            })),
          },
        }
      : {}),
  }
}
export function scheduleCrossword(state: CrosswordState, value: unknown, now = new Date()) {
  if (state.winner || crosswordOpen(state, now))
    throw createError({
      statusCode: 409,
      statusMessage: 'Et åbnet krydsord kan ikke planlægges om.',
    })
  let opensAt: string | null
  try {
    opensAt = crosswordOpeningTime(value)
  } catch (error) {
    throw createError({ statusCode: 400, statusMessage: (error as Error).message })
  }
  if (opensAt && Date.parse(opensAt) <= now.getTime())
    throw createError({ statusCode: 400, statusMessage: 'Vælg et tidspunkt i fremtiden.' })
  state.opensAt = opensAt
}
export function crosswordSolution() {
  return Object.fromEntries(
    CROSSWORD_PREVIEW.flatMap((entry) =>
      [...entry.answer].map((letter, i) => [
        `${entry.row + (entry.down ? i : 0)}:${entry.col + (entry.down ? 0 : i)}`,
        letter,
      ]),
    ),
  )
}

/** Save progress, but evaluate correctness only once per Danish 04:00 game day. */
export function crosswordHelp(
  state: CrosswordState,
  subject: string,
  answers: unknown,
  now = new Date(),
): CrosswordHelp {
  if (!crosswordOpen(state, now))
    throw createError({ statusCode: 403, statusMessage: 'Krydsordet er ikke åbnet endnu.' })
  if (!subject || !/^[ud]:/.test(subject))
    throw createError({ statusCode: 400, statusMessage: 'Enheden kunne ikke genkendes.' })
  if (!answers || typeof answers !== 'object' || Array.isArray(answers))
    throw createError({ statusCode: 400, statusMessage: 'Ugyldige felter.' })
  const solution = crosswordSolution()
  const entered = Object.entries(answers)
  if (
    entered.length > Object.keys(solution).length ||
    entered.some(
      ([cell, value]) =>
        !Object.hasOwn(solution, cell) || typeof value !== 'string' || !/^[A-ZÆØÅ]$/i.test(value),
    )
  )
    throw createError({ statusCode: 400, statusMessage: 'Ugyldige felter.' })
  const letters = Object.fromEntries(
    entered.map(([cell, value]) => [cell, (value as string).toLocaleUpperCase('da-DK')]),
  )
  const availableAt = crosswordHelpAt(state)
  const available = !!availableAt && Date.parse(availableAt) <= now.getTime()
  const progress = ((state.progress ??= {})[subject] ??= { letters })
  if (!progress.startedAt && (entered.length || Object.keys(progress.letters).length))
    progress.startedAt = now.toISOString()
  const completed = !!state.finished[subject]
  const day = gameDay(now)
  if (available && !completed && progress.checkedDay !== day) {
    // Use the last saved progress, before applying edits received after the reset.
    progress.correctLetters = Object.fromEntries(
      Object.entries(progress.letters).filter(([cell, value]) => value === solution[cell]),
    )
    progress.checkedDay = day
  }
  progress.letters = letters
  return {
    available,
    availableAt,
    nextAt: completed ? null : available ? nextGameReset(now) : availableAt,
    checkedDay: progress.checkedDay || null,
    correctLetters: available ? { ...progress.correctLetters } : {},
  }
}
/** Never returns individual correctness or the answer key. */
export function validateCrosswordAnswers(answers: unknown) {
  const solution = crosswordSolution()
  if (!answers || typeof answers !== 'object' || Array.isArray(answers))
    throw createError({ statusCode: 400, statusMessage: 'Udfyld hele krydsordet først.' })
  const values = answers as Record<string, unknown>
  if (
    Object.keys(values).length !== Object.keys(solution).length ||
    Object.keys(values).some((key) => !(key in solution)) ||
    Object.keys(solution).some(
      (key) => typeof values[key] !== 'string' || !/^[A-ZÆØÅ]$/i.test(values[key] as string),
    )
  )
    throw createError({ statusCode: 400, statusMessage: 'Udfyld alle felterne først.' })
  return Object.entries(solution).every(
    ([key, letter]) => (values[key] as string).toLocaleUpperCase('da-DK') === letter,
  )
}
export function submitCrossword(
  state: CrosswordState,
  name: string,
  answers: unknown,
  now = new Date(),
) {
  if (!crosswordOpen(state, now))
    throw createError({ statusCode: 403, statusMessage: 'Krydsordet er ikke åbnet endnu.' })
  const key = `u:${nameKey(name)}`
  if (state.finished[key]) return validateCrosswordAnswers(answers)
  if (state.attempts[key] && now.getTime() - state.attempts[key]! < 2000)
    throw createError({ statusCode: 429, statusMessage: 'Vent et øjeblik, før du prøver igen.' })
  const correct = validateCrosswordAnswers(answers)
  crosswordHelp(state, key, answers, now)
  state.attempts[key] = now.getTime()
  if (correct) {
    const finished = { name, at: now.toISOString() }
    state.finished[key] = finished
    state.winner ??= finished
  }
  return correct
}

/** Uses filled counts before help, then only the fixed daily correctness snapshot. */
export function crosswordLeaderboard(
  state: CrosswordState,
  users: { name: string }[],
  now = new Date(),
): CrosswordLeaderboard {
  const wordCells = CROSSWORD_PREVIEW.map((entry) =>
    Array.from(
      { length: entry.answer.length },
      (_, i) => `${entry.row + (entry.down ? i : 0)}:${entry.col + (entry.down ? 0 : i)}`,
    ),
  )
  const allCells = new Set(wordCells.flat())
  const helpAt = crosswordHelpAt(state)
  const mode = helpAt && Date.parse(helpAt) <= now.getTime() ? 'correct' : 'filled'
  const solution = mode === 'correct' ? crosswordSolution() : {}
  const day = gameDay(now)
  const names = new Map(users.map((user) => [nameKey(user.name), user.name]))
  const subjects = new Set([...Object.keys(state.progress || {}), ...Object.keys(state.finished)])
  const rows = [...subjects].flatMap((subject) => {
    const progress = state.progress?.[subject]
    const finished = state.finished[subject]
    const entered = Object.fromEntries(
      Object.entries(progress?.letters || {})
        .filter(
          ([cell, value]) =>
            allCells.has(cell) && typeof value === 'string' && /^[A-ZÆØÅ]$/i.test(value),
        )
        .map(([cell, value]) => [cell, value.toLocaleUpperCase('da-DK')]),
    )
    const filled = new Set(Object.keys(entered))
    if (!finished && !progress?.startedAt && !filled.size) return []
    // Offline players get the same projection their next 04:00 check will produce.
    const dailyCorrect =
      progress?.checkedDay === day
        ? progress.correctLetters || {}
        : Object.fromEntries(
            Object.entries(entered).filter(([cell, value]) => solution[cell] === value),
          )
    const counted =
      mode === 'filled'
        ? filled
        : new Set([...filled].filter((cell) => dailyCorrect[cell] === entered[cell]))
    const name = subject.startsWith('u:')
      ? names.get(subject.slice(2)) || finished?.name || subject.slice(2)
      : null
    return [
      {
        id: createHash('sha256')
          .update('crossword:1:' + subject)
          .digest('hex')
          .slice(0, 16),
        name,
        label: name || '',
        words: finished
          ? wordCells.length
          : wordCells.filter((cells) => cells.every((cell) => counted.has(cell))).length,
        letters: finished ? allCells.size : counted.size,
        completed: !!finished,
        winner: !!name && !!state.winner && nameKey(name) === nameKey(state.winner.name),
        startedAt: progress?.startedAt || finished?.at || '',
        finishedAt: finished?.at || '',
      },
    ]
  })
  rows.sort((a, b) => a.startedAt.localeCompare(b.startedAt) || a.id.localeCompare(b.id))
  let anonymous = 0
  for (const row of rows) if (!row.name) row.label = `Anonym ${++anonymous}`
  rows.sort(
    (a, b) =>
      Number(b.winner) - Number(a.winner) ||
      Number(b.completed) - Number(a.completed) ||
      (a.completed && b.completed ? a.finishedAt.localeCompare(b.finishedAt) : 0) ||
      b.words - a.words ||
      b.letters - a.letters ||
      a.startedAt.localeCompare(b.startedAt) ||
      a.id.localeCompare(b.id),
  )
  return {
    totalWords: wordCells.length,
    totalLetters: allCells.size,
    mode,
    helpAt,
    players: rows.map(({ startedAt: _started, finishedAt: _finished, ...row }) => row),
  }
}
/** Winner is committed first. This durable wallet receipt makes payment recoverable and idempotent. */
export async function settleCrosswordWinner(state: CrosswordState) {
  if (!state.winner) return false
  const winner = state.winner
  const existing = await readEconomy(winner.name)
  if (existing?.claims['crossword:1:winner'] && existing.crosswordWins?.[ID]) return false
  const { result } = await mutateEconomy(winner.name, (wallet) => {
    const paid = creditBananas(
      wallet,
      'crossword:1:winner',
      CROSSWORD_PRIZE,
      'Kryds & tværs #1 · første korrekte løsning',
      new Date(winner.at),
    )
    ;(wallet.crosswordWins ??= {})[ID] = winner.at
    return paid
  })
  return result
}
