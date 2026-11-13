import sharp from 'sharp'

export default defineEventHandler(async (event) => {
  const { user } = await economyUser(event)
  const day = gameDay()
  const query = getQuery(event)
  if (query.day !== day)
    throw createError({ statusCode: 409, statusMessage: 'Dagens billede er skiftet.' })
  const record = await readEconomy(user.name)
  const run = record?.days[day]?.city
  const stage = Math.min(4, run?.guesses.length ?? 0)
  // A failed image never consumes a guess; neither coordinates nor source URL are sent to the browser.
  const cache = useStorage('cache')
  const cacheKey = `daily-image:v1:${day}:${stage}`
  setHeader(event, 'Cache-Control', 'no-store')
  try {
    const cached = await cache.getItem<string>(cacheKey)
    if (typeof cached === 'string') {
      const image = Buffer.from(cached, 'base64')
      if (
        image.length > 4 &&
        image[0] === 0xff &&
        image[1] === 0xd8 &&
        image.at(-2) === 0xff &&
        image.at(-1) === 0xd9
      ) {
        setHeader(event, 'Content-Type', 'image/jpeg')
        setHeader(event, 'Cache-Control', 'private, max-age=30')
        return image
      }
    }
  } catch {
    console.warn('[city-image] Image cache read failed; fetching aerial image directly.')
  }
  const { answer } = await dailyChallenge(day)
  const lat = (answer.lat * Math.PI) / 180
  const x = (6378137 * answer.lng * Math.PI) / 180
  const y = 6378137 * Math.log(Math.tan(Math.PI / 4 + lat / 2))
  const half = [800, 4000, 20000, 100000, 500000][stage]! / Math.cos(lat) / 2
  const params = new URLSearchParams({
    bbox: `${x - half},${y - half * 0.7},${x + half},${y + half * 0.7}`,
    bboxSR: '3857',
    imageSR: '3857',
    size: '700,490',
    format: 'jpg',
    f: 'image',
  })
  // Bound both attempts so the fallback can finish before the client's 25 s timeout.
  for (const host of ['server.arcgisonline.com', 'services.arcgisonline.com']) {
    let image: Buffer
    try {
      const bytes = await $fetch<ArrayBuffer>(
        `https://${host}/ArcGIS/rest/services/World_Imagery/MapServer/export?${params}`,
        { responseType: 'arrayBuffer', timeout: 5_000, retry: 0 },
      )
      image = await sharp(Buffer.from(bytes)).resize(700, 490).jpeg({ quality: 82 }).toBuffer()
    } catch (error: any) {
      console.warn('[city-image] Aerial image request failed.', {
        host,
        status: error?.response?.status || error?.statusCode || null,
        name: error?.name || 'Error',
        cause: error?.cause?.code || error?.cause?.cause?.code || null,
      })
      continue
    }
    try {
      await cache.setItem(cacheKey, image.toString('base64'), { ttl: 36 * 3600 })
    } catch {
      console.warn('[city-image] Image cache write failed; returning uncached aerial image.')
    }
    setHeader(event, 'Content-Type', 'image/jpeg')
    setHeader(event, 'Cache-Control', 'private, max-age=30')
    return image
  }
  // Cached tiles bypass the dynamic export renderer, which fails for some areas.
  try {
    const image = await cityAerialTiles({ x, y, half })
    try {
      await cache.setItem(cacheKey, image.toString('base64'), { ttl: 36 * 3600 })
    } catch {
      console.warn('[city-image] Image cache write failed; returning uncached aerial image.')
    }
    setHeader(event, 'Content-Type', 'image/jpeg')
    setHeader(event, 'Cache-Control', 'private, max-age=30')
    return image
  } catch {
    console.warn('[city-image] Aerial map tile fallback failed.')
  }
  throw createError({
    statusCode: 502,
    statusMessage: 'Luftfotoet kunne ikke hentes. Prøv igen uden at bruge et gæt.',
  })
})
