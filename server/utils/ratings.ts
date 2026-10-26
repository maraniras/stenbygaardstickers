// 👍 (1–5) gemmes i Upstash Redis (Vercel Marketplace). Uden Redis-nøgler
// bruges Nitros lokale storage, så det også virker under `npm run dev`.
// Redis: hash "rating:<stickerId>" med deviceId → antal 👍, og et set "rated"
// med alle sticker-id'er, der har fået 👍. (Nøglerne er fra dengang det var stjerner.)

export const ratingsEnabled = redisEnabled || import.meta.dev

function summarize(values: number[], mine?: number): RatingSummary {
  const sum = values.reduce((a, b) => a + b, 0)
  return { avg: values.length ? sum / values.length : 0, count: values.length, mine }
}

type LocalData = Record<string, Record<string, number>>

export async function getRatings(device?: string) {
  const out: Record<string, RatingSummary> = {}
  if (!redisEnabled) {
    const data = (await useStorage('data').getItem<LocalData>('ratings')) ?? {}
    for (const [id, byDevice] of Object.entries(data)) {
      if (!Object.keys(byDevice).length) continue
      out[id] = summarize(Object.values(byDevice), device ? byDevice[device] : undefined)
    }
    return out
  }
  const [ids] = await redis([['SMEMBERS', 'rated']]) as [string[]]
  if (!ids.length) return out
  const res = await redis(ids.flatMap(id => [['HVALS', `rating:${id}`], ['HGET', `rating:${id}`, device || '-']]))
  ids.forEach((id, i) => {
    const values = (res[i * 2] as string[]).map(Number)
    if (!values.length) return
    const mine = res[i * 2 + 1] as string | null
    out[id] = summarize(values, mine ? Number(mine) : undefined)
  })
  return out
}

/** value 0 fjerner enhedens 👍 */
export async function setRating(stickerId: string, device: string, value: number) {
  if (!redisEnabled) {
    const storage = useStorage('data')
    const data = (await storage.getItem<LocalData>('ratings')) ?? {}
    data[stickerId] = { ...data[stickerId] }
    if (value) data[stickerId][device] = value
    else delete data[stickerId][device]
    await storage.setItem('ratings', data)
    return
  }
  await redis(value
    ? [['HSET', `rating:${stickerId}`, device, value], ['SADD', 'rated', stickerId]]
    : [['HDEL', `rating:${stickerId}`, device]])
}
