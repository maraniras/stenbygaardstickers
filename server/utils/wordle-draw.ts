import { createHmac } from 'node:crypto'
import { WORDLE_ANSWERS } from '../data/wordle-answers'
import { WORDLE_GENERAL } from '../data/wordle-general'
import allowed from '../data/wordle-allowed.json'
import { gameSecret } from './daily-challenge'

export interface WordleHistory {
  migrated: boolean
  days: Record<string, string>
  used: string[]
}
const STORE = 'games:wordle:history'
const FIELD = '1'
const CAS = `if (redis.call('HGET', KEYS[1], ARGV[1]) or '') ~= ARGV[2] then return 0 end
redis.call('HSET', KEYS[1], ARGV[1], ARGV[3]); return 1`
const references = new Set(WORDLE_ANSWERS)
const dictionary = new Set(allowed)
const general = [...new Set(WORDLE_GENERAL)].filter(
  (word) => dictionary.has(word) && !references.has(word),
)
let localTail = Promise.resolve()

async function rawHistory() {
  if (redisEnabled) return (await redis([['HGET', STORE, FIELD]]))[0] as string | null
  const raw = await useStorage('data').getItem<string | WordleHistory>(STORE)
  return raw ? (typeof raw === 'string' ? raw : JSON.stringify(raw)) : null
}
export async function readWordleHistory(): Promise<WordleHistory> {
  const raw = await rawHistory()
  return raw ? JSON.parse(raw) : { migrated: false, days: {}, used: [] }
}
async function mutateHistory<T>(change: (history: WordleHistory) => T) {
  let release = () => {}
  const before = localTail
  if (!redisEnabled) {
    localTail = new Promise<void>((resolve) => {
      release = resolve
    })
    await before
  }
  try {
    for (let attempt = 0; attempt < 24; attempt++) {
      const raw = await rawHistory()
      const history: WordleHistory = raw ? JSON.parse(raw) : { migrated: false, days: {}, used: [] }
      const result = change(history)
      const next = JSON.stringify(history)
      if (next === raw) return result
      if (redisEnabled) {
        if ((await redisEval(CAS, [STORE], [FIELD, raw ?? '', next])) !== 1) continue
      } else await useStorage('data').setItem(STORE, next)
      return result
    }
    throw createError({ statusCode: 409, statusMessage: 'Dagens ord blev opdateret. Prøv igen.' })
  } finally {
    release()
  }
}
/** Exact 80/20 pool boundary; exhaust a pool without ever recycling a used word. */
export function selectWordleAnswer(
  used: ReadonlySet<string>,
  poolTicket: number,
  wordTicket: number,
): string {
  if (
    !Number.isSafeInteger(poolTicket) ||
    poolTicket < 0 ||
    poolTicket >= 10000 ||
    !Number.isSafeInteger(wordTicket) ||
    wordTicket < 0
  )
    throw new Error('Ugyldigt Wordle-lod')
  const refs = WORDLE_ANSWERS.filter((word) => !used.has(word))
  let others = general.filter((word) => !used.has(word))
  if (!others.length) others = allowed.filter((word) => !references.has(word) && !used.has(word))
  const preferred = poolTicket < 8000 ? refs : others
  const pool = preferred.length ? preferred : poolTicket < 8000 ? others : refs
  if (!pool.length)
    throw createError({
      statusCode: 503,
      statusMessage: 'Alle dagens ord er brugt. Der skal tilføjes flere ord.',
    })
  return pool[wordTicket % pool.length]!
}
/** Recover both pre-history cache formats from Wordle's first local release onward. */
async function legacyAnswers(day: string, migrated: boolean) {
  const start = migrated ? day : '2026-11-16'
  const dates: string[] = []
  for (let d = Date.parse(`${start}T12:00:00Z`); d <= Date.parse(`${day}T12:00:00Z`); d += 86400000)
    dates.push(new Date(d).toISOString().slice(0, 10))
  if (!dates.includes(day)) dates.push(day)
  const keys = dates.flatMap((date) => [
    `games:wordle:${date}`,
    `games:wordle:references-v1:${date}`,
  ])
  const values = redisEnabled
    ? await redis(keys.map((key) => ['GET', key]))
    : await Promise.all(keys.map((key) => useStorage('data').getItem(key)))
  return dates.map((date, index) => ({
    day: date,
    words: values
      .slice(index * 2, index * 2 + 2)
      .filter((value): value is string => typeof value === 'string' && /^[A-ZÆØÅ]{5}$/.test(value)),
  }))
}
export async function dailyWordleAnswer(day: string): Promise<string> {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(day) ||
    !Number.isFinite(Date.parse(`${day}T12:00:00Z`)) ||
    new Date(`${day}T12:00:00Z`).toISOString().slice(0, 10) !== day
  )
    throw createError({ statusCode: 400, statusMessage: 'Ugyldigt spildøgn.' })
  const current = await readWordleHistory()
  if (current.migrated && current.days[day]) return current.days[day]!
  const [legacy, secret] = await Promise.all([legacyAnswers(day, current.migrated), gameSecret()])
  const hash = createHmac('sha256', secret).update(`wordle-weighted-v1:${day}`).digest()
  return mutateHistory((history) => {
    const used = new Set(history.used)
    for (const entry of legacy) {
      for (const word of entry.words) used.add(word)
      if (!history.days[entry.day] && entry.words.length)
        history.days[entry.day] = entry.words.at(-1)!
    }
    history.migrated = true
    if (!history.days[day]) {
      const answer = selectWordleAnswer(used, hash.readUInt32BE(0) % 10000, hash.readUInt32BE(4))
      history.days[day] = answer
      used.add(answer)
    }
    history.used = [...used]
    return history.days[day]!
  })
}
