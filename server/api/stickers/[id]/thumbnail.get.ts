import sharp from 'sharp'
import { createHash } from 'node:crypto'

/** Only approved sticker media may be transformed; no arbitrary remote URL input. */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') ?? ''
  const sticker = STICKER_RE.test(id) ? await getStored(id) : undefined
  if (!sticker || sticker.status !== 'approved') throw createError({ statusCode: 404 })
  const media = sticker.media[0]
  const src = media?.type === 'video' ? media.poster : media?.src
  const safeLocal = /^\/(?:media\/[\w/-]+|api\/media\/[\w-]+)\.(?:webp|jpg|jpeg|png)$/i
  if (!src || !isOwnMedia(src) || (src.startsWith('/') && !safeLocal.test(src)))
    throw createError({ statusCode: 404 })
  const requested = Number(getQuery(event).width)
  const width = [160, 320, 640].includes(requested) ? requested : 320
  const key = 'thumbnail:' + createHash('sha256').update(`${src}:${width}`).digest('hex')
  if (src.startsWith('/media/')) {
    const bundled = await useStorage('assets:thumbnails').getItemRaw<Buffer>(
      key.slice('thumbnail:'.length) + '.webp',
    )
    if (bundled) {
      setHeader(event, 'Content-Type', 'image/webp')
      setHeader(event, 'Cache-Control', 'public, max-age=300')
      return bundled
    }
  }
  const cache = useStorage('cache')
  const cached = await cache.getItem<string>(key)
  setHeader(event, 'Content-Type', 'image/webp')
  setHeader(event, 'Cache-Control', 'public, max-age=300')
  if (cached) return Buffer.from(cached, 'base64')
  try {
    const bytes = src.startsWith('/api/media/')
      ? await useStorage('data').getItemRaw<Buffer>('uploads:' + src.split('/').pop())
      : src.startsWith('/')
        ? await event.$fetch<ArrayBuffer>(src, {
            responseType: 'arrayBuffer',
            timeout: 10_000,
            retry: 0,
          })
        : await $fetch<ArrayBuffer>(src, { responseType: 'arrayBuffer', timeout: 10_000, retry: 0 })
    if (!bytes) throw new Error('Billedet findes ikke')
    const input = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes)
    const result = await sharp(input, { limitInputPixels: 40_000_000 })
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 75 })
      .toBuffer()
    await cache.setItem(key, result.toString('base64'), { ttl: 86400 })
    return result
  } catch {
    setHeader(event, 'Cache-Control', 'no-store')
    throw createError({ statusCode: 502, statusMessage: 'Miniaturen kunne ikke hentes' })
  }
})
