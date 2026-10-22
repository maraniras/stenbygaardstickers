export interface StickerMedia {
  type: 'image' | 'video'
  src: string
  /** Stillbillede til video */
  poster?: string
  width?: number
  height?: number
}

export interface StickerData {
  id: string
  title: string
  /** YYYY-MM-DD */
  date: string
  placedBy: string[]
  lat: number
  lng: number
  country: string
  /** ISO 3166-1 alpha-2, fx "DK" */
  countryCode: string
  city: string
  description: string
  media: StickerMedia[]
}

export interface Sticker extends StickerData {
  distanceKm: number
}

export const AALBORG = { lat: 57.0488, lng: 9.9217 }

export function distanceKm(a: { lat: number, lng: number }, b: { lat: number, lng: number }) {
  const R = 6371
  const rad = Math.PI / 180
  const dLat = (b.lat - a.lat) * rad
  const dLng = (b.lng - a.lng) * rad
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

const files = import.meta.glob<StickerData>('../data/stickers/*.json', { eager: true, import: 'default' })

/** Alle stickers, nyeste først */
export const stickers: Sticker[] = Object.values(files)
  .map(s => ({ ...s, distanceKm: distanceKm(AALBORG, s) }))
  .sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title))

export function getSticker(id: string) {
  return stickers.find(s => s.id === id)
}

export function googleMapsUrl(s: { lat: number, lng: number }) {
  return `https://www.google.com/maps/search/?api=1&query=${s.lat},${s.lng}`
}

export function formatDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString('da-DK', { day: 'numeric', month: 'long', year: 'numeric' })
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

export const stats = {
  count: stickers.length,
  countries: new Set(stickers.map(s => s.countryCode)).size,
  cities: new Set(stickers.map(s => `${s.countryCode}:${s.city}`)).size,
  farthest: stickers.reduce<Sticker | undefined>((max, s) => (!max || s.distanceKm > max.distanceKm ? s : max), undefined),
}
