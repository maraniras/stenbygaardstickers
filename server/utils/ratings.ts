// Stjerner gemmes i Upstash Redis (Vercel Marketplace). Uden Redis-nøgler
// bruges Nitros lokale storage, så det også virker under `npm run dev`.
// Redis: hash "rating:<stickerId>" med deviceId → stjerner, og et set "rated"
// med alle sticker-id'er, der har fået stjerner.

export interface RatingSummary {
  avg: number
  count: number
  mine?: number
}

const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN

export const ratingsEnabled = Boolean(url && token) || import.meta.dev

async function pipeline(cmds: (string | number)[][]) {
  const res = await $fetch<{ result: unknown, error?: string }[]>(`${url}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: cmds,
  })
  return res.map((r) => {
    if (r.error) throw new Error(r.error)
    return r.result
  })
}

function summarize(values: number[], mine?: number): RatingSummary {
  const sum = values.reduce((a, b) => a + b, 0)
  return { avg: values.length ? sum / values.length : 0, count: values.length, mine }
}

type LocalData = Record<string, Record<string, number>>

export async function getRatings(device?: string) {
  const out: Record<string, RatingSummary> = {}
  if (!url) {
    const data = (await useStorage('data').getItem<LocalData>('ratings')) ?? {}
    for (const [id, byDevice] of Object.entries(data)) {
      out[id] = summarize(Object.values(byDevice), device ? byDevice[device] : undefined)
    }
    return out
  }
  const [ids] = await pipeline([['SMEMBERS', 'rated']]) as [string[]]
  if (!ids.length) return out
  const res = await pipeline(ids.flatMap(id => [['HVALS', `rating:${id}`], ['HGET', `rating:${id}`, device || '-']]))
  ids.forEach((id, i) => {
    const values = (res[i * 2] as string[]).map(Number)
    const mine = res[i * 2 + 1] as string | null
    out[id] = summarize(values, mine ? Number(mine) : undefined)
  })
  return out
}

export async function setRating(stickerId: string, device: string, stars: number) {
  if (!url) {
    const storage = useStorage('data')
    const data = (await storage.getItem<LocalData>('ratings')) ?? {}
    data[stickerId] = { ...data[stickerId], [device]: stars }
    await storage.setItem('ratings', data)
    return
  }
  await pipeline([
    ['HSET', `rating:${stickerId}`, device, stars],
    ['SADD', 'rated', stickerId],
  ])
}
