import { createHmac, randomBytes } from 'node:crypto'
import cities from '../data/daily-cities.json'

let secretPromise: Promise<string> | undefined
async function gameSecret() {
  if (!secretPromise)
    secretPromise = (async () => {
      if (!redisEnabled) {
        const storage = useStorage('data')
        const previous = await storage.getItem<string>('games:secret')
        if (previous) return previous
        const secret = randomBytes(32).toString('hex')
        await storage.setItem('games:secret', secret)
        return secret
      }
      await redis([['SET', 'games:secret', randomBytes(32).toString('hex'), 'NX']])
      const [secret] = (await redis([['GET', 'games:secret']])) as [string]
      if (!secret) throw new Error('Spilnøglen kunne ikke hentes')
      return secret
    })().catch((error) => {
      secretPromise = undefined
      throw error
    })
  return secretPromise
}
export async function gameBackup() {
  return { secret: await gameSecret() }
}
/** One shared, persisted amount per 04:00 Danish game day. Independent of city choice. */
export async function dailyWheelJackpot(day: string): Promise<number> {
  const key = `games:jackpot:${day}`
  const storage = useStorage('data')
  const existing = redisEnabled
    ? (await redis([['GET', key]]))[0]
    : await storage.getItem<number | string>(key)
  if (existing !== null && existing !== undefined) return Number(existing)
  const hash = createHmac('sha256', await gameSecret())
    .update(`wheel-jackpot-v1:${day}`)
    .digest()
  const amount = dailyJackpotFor(hash.readUInt32BE(0) % 10000)
  if (redisEnabled) {
    await redis([['SET', key, amount, 'NX', 'EX', 40 * 86400]])
    return Number((await redis([['GET', key]]))[0])
  }
  await storage.setItem(key, amount)
  return amount
}
export async function dailyChallenge(day: string) {
  const storage = useStorage('data')
  const key = `games:challenge:${day}`
  type Challenge = { answer: (typeof cities)[number]; options: typeof cities }
  const existing = redisEnabled
    ? ((await redis([['GET', key]]))[0] as string | null)
    : await storage.getItem<string | Challenge>(key)
  if (existing) return typeof existing === 'string' ? (JSON.parse(existing) as Challenge) : existing
  const secret = await gameSecret()
  const groups = Math.floor(cities.length / 6)
  if (groups < 21) throw new Error('For få byer til 20 dages pause')
  const dayNumber = Math.floor(Date.parse(`${day}T12:00:00Z`) / 86400_000)
  const groupOrder = Array.from({ length: groups }, (_, i) => i).sort((a, b) =>
    createHmac('sha256', secret)
      .update(`group:${a}`)
      .digest()
      .compare(createHmac('sha256', secret).update(`group:${b}`).digest()),
  )
  const group = groupOrder[((dayNumber % groups) + groups) % groups]!
  const options = cities.slice(group * 6, group * 6 + 6)
  const hash = createHmac('sha256', secret).update(`city-v1:${day}`).digest()
  const answer = options[hash.readUInt32BE(0) % options.length]!
  const shuffled = options
    .map((city, i) => ({ city, order: hash.readUInt32BE(4 + i * 4) }))
    .sort((a, b) => a.order - b.order)
    .map((x) => x.city)
  const value = JSON.stringify({ answer, options: shuffled })
  if (redisEnabled) {
    await redis([['SET', key, value, 'NX', 'EX', 40 * 86400]])
    const [saved] = (await redis([['GET', key]])) as [string]
    return JSON.parse(saved) as Challenge
  }
  await storage.setItem(key, value)
  return { answer, options: shuffled }
}
