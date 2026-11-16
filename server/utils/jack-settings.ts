import type { JackShuffleMode } from '../../shared/types/bananjack'

const KEY = 'bananjack:shuffle-mode'

export async function readJackShuffleMode(): Promise<JackShuffleMode> {
  const value = redisEnabled
    ? (await redis([['GET', KEY]]))[0]
    : await useStorage('data').getItem(KEY)
  return value === 'per-round' ? 'per-round' : 'continuous'
}

export async function saveJackShuffleMode(value: unknown): Promise<JackShuffleMode> {
  if (value !== 'continuous' && value !== 'per-round')
    throw createError({ statusCode: 400, statusMessage: 'Vælg en gyldig blandingsmetode.' })
  if (redisEnabled) await redis([['SET', KEY, value]])
  else await useStorage('data').setItem(KEY, value)
  return value
}
