// Stickers ligger i Redis-hashen "stickers" (id → JSON) med status pending/approved.
// JSON-filerne i app/data/stickers er startdata: hver fil kopieres ind én gang
// (id'et huskes i settet "stickers:seeded"), så ændringer og sletninger i admin
// ikke bliver overskrevet. Uden Redis bruges Nitros lokale storage i `.data/`.

interface LocalData {
  stickers: Record<string, StoredSticker>
  seeded: string[]
}

let seededIds: Promise<void> | undefined

async function readLocal(): Promise<LocalData> {
  return (await useStorage('data').getItem<LocalData>('stickers')) ?? { stickers: {}, seeded: [] }
}

async function seedFiles(): Promise<StoredSticker[]> {
  const assets = useStorage('assets:seed')
  const out: StoredSticker[] = []
  for (const key of await assets.getKeys()) {
    if (!key.endsWith('.json')) continue
    const raw = await assets.getItem(key)
    const data = (typeof raw === 'string' ? JSON.parse(raw) : raw) as StickerData
    out.push({ ...data, status: 'approved' })
  }
  return out
}

// Dev-siden (Vercel Preview) har sin egen database. Første gang henter den de
// godkendte stickers fra den rigtige app, så der er noget at teste på. Den læser
// kun det offentlige API – prod bliver aldrig ændret herfra.
const PROD_URL = process.env.PROD_URL || 'https://stenbygaardstickers.vercel.app'

async function copyFromProd() {
  const [done] = await redis([['GET', 'stickers:prodcopy']]) as [string | null]
  if (done) return
  const list = await $fetch<StickerData[]>(`${PROD_URL}/api/stickers`, { timeout: 10000 })
  await redis([
    ...list.map(s => ['HSETNX', 'stickers', s.id, JSON.stringify({ ...s, status: 'approved' })]),
    ['SET', 'stickers:prodcopy', new Date().toISOString()],
  ])
}

/** Kopierer nye JSON-filer fra repoet ind i databasen */
function ensureSeeded() {
  seededIds ??= (async () => {
    if (process.env.VERCEL_ENV === 'preview' && redisEnabled) {
      await copyFromProd().catch(err => console.error('Kunne ikke kopiere fra prod', err))
    }
    const files = await seedFiles()
    if (!redisEnabled) {
      const data = await readLocal()
      const fresh = files.filter(s => !data.seeded.includes(s.id))
      if (!fresh.length) return
      for (const s of fresh) {
        data.stickers[s.id] ??= s
        data.seeded.push(s.id)
      }
      await useStorage('data').setItem('stickers', data)
      return
    }
    const [seeded] = await redis([['SMEMBERS', 'stickers:seeded']]) as [string[]]
    const fresh = files.filter(s => !seeded.includes(s.id))
    if (!fresh.length) return
    await redis(fresh.flatMap(s => [
      ['HSETNX', 'stickers', s.id, JSON.stringify(s)],
      ['SADD', 'stickers:seeded', s.id],
    ]))
  })().catch((err) => {
    seededIds = undefined
    throw err
  })
  return seededIds
}

export async function listStickers() {
  await ensureSeeded()
  let list: StoredSticker[]
  if (!redisEnabled) {
    list = Object.values((await readLocal()).stickers)
  }
  else {
    const [flat] = await redis([['HGETALL', 'stickers']]) as [string[]]
    list = []
    for (let i = 1; i < flat.length; i += 2) list.push(JSON.parse(flat[i]!))
  }
  return list.sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title))
}

export async function getStored(id: string) {
  await ensureSeeded()
  if (!redisEnabled) return (await readLocal()).stickers[id]
  const [json] = await redis([['HGET', 'stickers', id]]) as [string | null]
  return json ? JSON.parse(json) as StoredSticker : undefined
}

export async function saveSticker(s: StoredSticker) {
  await ensureSeeded()
  if (!redisEnabled) {
    const data = await readLocal()
    data.stickers[s.id] = s
    await useStorage('data').setItem('stickers', data)
    return
  }
  await redis([['HSET', 'stickers', s.id, JSON.stringify(s)]])
}

export async function removeSticker(id: string) {
  await ensureSeeded()
  if (!redisEnabled) {
    const data = await readLocal()
    delete data.stickers[id]
    await useStorage('data').setItem('stickers', data)
    return
  }
  await redis([['HDEL', 'stickers', id]])
}

/** Uden status – det er det, kortet og listen får */
export function publicSticker({ status: _, submittedAt: __, ...s }: StoredSticker): StickerData {
  return s
}

export async function reverseGeocode(lat: number, lng: number) {
  try {
    const j = await $fetch<{ address?: Record<string, string> }>('https://nominatim.openstreetmap.org/reverse', {
      query: { format: 'jsonv2', lat, lon: lng, zoom: 18, 'accept-language': 'da' },
      headers: { 'User-Agent': 'StenbygaardStickers/1.0 (privat hobbyprojekt)' },
      timeout: 8000,
    })
    const a = j.address ?? {}
    return {
      city: a.city || a.town || a.village || a.municipality || a.hamlet || a.county || a.state || '',
      country: a.country || '',
      countryCode: (a.country_code || '').toUpperCase(),
    }
  }
  catch {
    return { city: '', country: '', countryCode: '' }
  }
}

const slug = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
  .replace(/æ/g, 'ae').replace(/ø/g, 'oe').replace(/å/g, 'aa')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50)

/** Id som scriptet laver dem: dato-by-titel, med tal på hvis det er taget */
export async function newStickerId(date: string, city: string, title: string) {
  const parts = [...new Set([slug(city), slug(title)].filter(Boolean))]
  const base = [date, ...parts].join('-')
  const taken = new Set((await listStickers()).map(s => s.id))
  let id = base
  for (let n = 2; taken.has(id); n++) id = `${base}-${n}`
  return id
}

/** Tjekker og renser felter fra upload- og admin-formularen */
export function cleanInput(body: unknown) {
  const b = (body ?? {}) as Record<string, unknown>
  const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
  const title = str(b.title, 80)
  const date = str(b.date, 10)
  const description = str(b.description, 3000)
  const lat = Number(b.lat)
  const lng = Number(b.lng)
  const placedBy = Array.isArray(b.placedBy)
    ? [...new Set(b.placedBy.map(n => str(n, 40).replace(/\s+/g, ' ')).filter(Boolean))].slice(0, 12)
    : []
  const media = Array.isArray(b.media) ? b.media.slice(0, 20).map(cleanMedia) : []

  if (!title) throw createError({ statusCode: 400, statusMessage: 'Mangler titel' })
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) {
    throw createError({ statusCode: 400, statusMessage: 'Ugyldig dato' })
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    throw createError({ statusCode: 400, statusMessage: 'Ugyldigt koordinat' })
  }
  return { title, date, description, lat, lng, placedBy, media }
}

function cleanMedia(m: unknown): StickerMedia {
  const o = (m ?? {}) as Record<string, unknown>
  const okSrc = (v: unknown) => typeof v === 'string' && isOwnMedia(v)
  if (!okSrc(o.src) || (o.poster !== undefined && !okSrc(o.poster)) || (o.type !== 'image' && o.type !== 'video')) {
    throw createError({ statusCode: 400, statusMessage: 'Ugyldigt medie' })
  }
  const dim = (v: unknown) => (typeof v === 'number' && v > 0 && v < 20000 ? Math.round(v) : undefined)
  return {
    type: o.type,
    src: o.src as string,
    ...(o.poster ? { poster: o.poster as string } : {}),
    width: dim(o.width),
    height: dim(o.height),
  }
}
