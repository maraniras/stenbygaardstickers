import sharp from 'sharp'

export default defineEventHandler(async event => {
  const { user } = await economyUser(event)
  const day = gameDay()
  const query = getQuery(event)
  if (query.day !== day) throw createError({ statusCode: 409, statusMessage: 'Dagens billede er skiftet.' })
  const record = await readEconomy(user.name)
  const run = record?.days[day]?.city
  const stage = Math.min(4, run?.guesses.length ?? 0)
  // A failed image never consumes a guess; neither coordinates nor source URL are sent to the browser.
  const cache = useStorage('cache')
  const cacheKey = `daily-image:v1:${day}:${stage}`
  const cached = await cache.getItem<string>(cacheKey)
  setHeader(event, 'Content-Type', 'image/jpeg')
  setHeader(event, 'Cache-Control', 'private, max-age=30')
  if (cached) return Buffer.from(cached, 'base64')
  const { answer } = await dailyChallenge(day)
  const lat = answer.lat * Math.PI / 180
  const x = 6378137 * answer.lng * Math.PI / 180
  const y = 6378137 * Math.log(Math.tan(Math.PI / 4 + lat / 2))
  const half = [800, 4000, 20000, 100000, 500000][stage]! / Math.cos(lat) / 2
  const params = new URLSearchParams({ bbox: `${x - half},${y - half * .7},${x + half},${y + half * .7}`, bboxSR: '3857', imageSR: '3857', size: '700,490', format: 'jpg', f: 'image' })
  try {
    const bytes = await $fetch<ArrayBuffer>(`https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?${params}`, { responseType: 'arrayBuffer', timeout: 15_000, retry: 1 })
    const image = await sharp(Buffer.from(bytes)).resize(700, 490).jpeg({ quality: 82 }).toBuffer()
    await cache.setItem(cacheKey, image.toString('base64'), { ttl: 36 * 3600 })
    return image
  }
  catch { throw createError({ statusCode: 502, statusMessage: 'Luftfotoet kunne ikke hentes. Prøv igen uden at bruge et gæt.' }) }
})
