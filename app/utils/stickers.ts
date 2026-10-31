// StickerData og StickerMedia ligger i shared/types/sticker.ts; Sticker, afstande og
// sameName i shared/utils/sticker.ts (bruges også af badges på serveren).
// Selve listen hentes fra serveren med useStickers().

export function googleMapsUrl(s: { lat: number; lng: number }) {
  return `https://www.google.com/maps/search/?api=1&query=${s.lat},${s.lng}`
}

export function formatDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString('da-DK', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function formatKm(km: number) {
  return `${Math.round(km).toLocaleString('da-DK')} km`
}

export function formatNames(names: string[]) {
  if (names.length <= 1) return names[0] ?? ''
  return `${names.slice(0, -1).join(', ')} og ${names[names.length - 1]}`
}

export function thumbnail(s: StickerData) {
  const m = s.media[0]
  if (!m) return undefined
  return m.type === 'video' ? m.poster : m.src
}

/** Alle der har sat stickers op, flest først */
export function countPeople(list: StickerData[]) {
  const counts = new Map<string, number>()
  for (const s of list) {
    for (const n of s.placedBy) {
      const key = [...counts.keys()].find((k) => sameName(k, n)) ?? n
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
  }
  return [...counts]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'da'))
}

/** Dansk ejefald: Nicoles, Mathias' */
export function genitive(name: string) {
  return /[sxz]$/i.test(name) ? `${name}'` : `${name}s`
}

export function personUrl(name: string) {
  return `/person/${encodeURIComponent(name)}`
}

export function statsFor(list: Sticker[]) {
  return {
    count: list.length,
    countries: new Set(list.map((s) => s.countryCode)).size,
    cities: new Set(list.map((s) => `${s.countryCode}:${s.city}`)).size,
    farthest: list.reduce<Sticker | undefined>(
      (max, s) => (!max || s.distanceKm > max.distanceKm ? s : max),
      undefined,
    ),
  }
}

/** Koordinat som Google Maps kopierer det: "55.676098, 12.568337" */
export function formatCoords(lat: number, lng: number) {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`
}

/** Læser "55.676098, 12.568337" (også med mellemrum eller semikolon) */
export function parseCoords(text: string) {
  const m = text.trim().match(/^(-?\d{1,2}(?:\.\d+)?)\s*[,;\s]\s*(-?\d{1,3}(?:\.\d+)?)$/)
  if (!m) return undefined
  const lat = Number(m[1])
  const lng = Number(m[2])
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return undefined
  return { lat, lng }
}

export function today() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Det upload- og admin-formularen redigerer */
export interface StickerDraft {
  title: string
  date: string
  description: string
  placedBy: string[]
  location: { lat: number; lng: number } | null
  media: StickerMedia[]
  city: string
  country: string
  countryCode: string
}

export function emptyDraft(): StickerDraft {
  return {
    title: '',
    date: today(),
    description: '',
    placedBy: [],
    location: null,
    media: [],
    city: '',
    country: '',
    countryCode: '',
  }
}

export function draftFrom(s: StickerData): StickerDraft {
  return {
    title: s.title,
    date: s.date,
    description: s.description,
    placedBy: [...s.placedBy],
    location: { lat: s.lat, lng: s.lng },
    media: [...s.media],
    city: s.city,
    country: s.country,
    countryCode: s.countryCode,
  }
}

/** Det serveren skal have */
export function draftBody(d: StickerDraft) {
  const { location, ...rest } = d
  return { ...rest, lat: location?.lat, lng: location?.lng }
}
