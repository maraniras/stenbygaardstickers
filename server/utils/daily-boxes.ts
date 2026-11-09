import { createHmac } from 'node:crypto'
import { BOX_PRIZES, validBoxChoices, boxesSeason } from '../../shared/utils/boxes'
import { boxesAchievements } from '../../shared/utils/boxes-badges'
import type { BoxPrize, BoxesRun } from '../../shared/types/boxes'
import type { EconomyRecord } from '../../shared/types/economy'
import { trimGameDays } from './daily-games'

/** Private, stable daily layout. Never returned before or after playing. */
export async function dailyBoxesBoard(day: string): Promise<BoxPrize[]> {
  const key = `games:boxes:${day}`
  const storage = useStorage('data')
  const raw = redisEnabled
    ? ((await redis([['GET', key]]))[0] as string | null)
    : await storage.getItem<string | BoxPrize[]>(key)
  if (raw) return typeof raw === 'string' ? JSON.parse(raw) : raw
  const secret = await gameSecret()
  const board = BOX_PRIZES.map((prize) => ({ ...prize }))
  let counter = 0
  for (let i = board.length - 1; i > 0; i--) {
    const bound = i + 1,
      limit = Math.floor(0x100000000 / bound) * bound
    let ticket: number
    do {
      ticket = createHmac('sha256', secret)
        .update(`daily-boxes-v1:${day}:${counter++}`)
        .digest()
        .readUInt32BE(0)
    } while (ticket >= limit)
    const j = ticket % bound
    ;[board[i], board[j]] = [board[j]!, board[i]!]
  }
  if (redisEnabled) {
    await redis([['SET', key, JSON.stringify(board), 'NX', 'EX', 40 * 86400]])
    return JSON.parse((await redis([['GET', key]]))[0] as string)
  }
  await storage.setItem(key, board)
  return board
}

/** Called inside wallet CAS; retries/devices cannot reveal or pay another selection. */
export function applyBoxesPick(
  record: EconomyRecord,
  day: string,
  choices: unknown,
  board: readonly BoxPrize[],
  now = new Date(),
): BoxesRun {
  requireBoxesSeason(now)
  if (gameDay(now) !== day)
    throw createError({
      statusCode: 409,
      statusMessage: 'Et nyt spildøgn er startet. Hent dagens bokse igen.',
    })
  if (!validBoxChoices(choices))
    throw createError({ statusCode: 400, statusMessage: 'Vælg præcis tre forskellige bokse.' })
  const saved = record.days[day]?.boxes
  if (saved) return saved
  const prizes = choices.map((index) => ({ ...board[index]! }))
  const nominal = prizes.reduce((sum, prize) => sum + prize.amount, 0)
  const claim = `boxes:${day}`
  const amount = record.claims[claim] ? 0 : Math.max(-record.balance, nominal)
  if (!Number.isSafeInteger(amount) || !Number.isSafeInteger(record.balance + amount))
    throw createError({ statusCode: 500, statusMessage: 'Boksene kunne ikke afregnes.' })
  const run: BoxesRun = {
    choices: [...choices],
    prizes,
    nominal,
    amount,
    playedAt: now.toISOString(),
  }
  ;(record.days[day] ??= {}).boxes = run
  record.claims[claim] = true
  record.balance += amount
  record.peakBalance = Math.max(record.peakBalance, record.balance)
  const achievements = boxesAchievements(record)
  if (achievements) record.boxesAchievements = achievements
  if (amount !== 0) {
    record.history.unshift({
      id: claim,
      amount,
      label: 'Dagens bokse · tre fund',
      at: now.toISOString(),
    })
    record.history = record.history.slice(0, 250)
  }
  trimGameDays(record, day)
  return run
}
export function requireBoxesSeason(now = new Date()) {
  if (!boxesSeason(now).active)
    throw createError({
      statusCode: 403,
      statusMessage: 'Dagens bokse er kun åben fra 20. november til 31. december.',
    })
}
