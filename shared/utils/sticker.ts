// Fælles for app og server: sticker med afstand fra Aalborg og navne-sammenligning.
export interface Sticker extends StickerData {
  distanceKm: number
}

export const AALBORG = { lat: 57.0488, lng: 9.9217 }

export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371
  const rad = Math.PI / 180
  const dLat = (b.lat - a.lat) * rad
  const dLng = (b.lng - a.lng) * rad
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

/** Med afstand fra Aalborg, nyeste først */
export function withDistance(list: StickerData[]): Sticker[] {
  return list
    .map((s) => ({ ...s, distanceKm: distanceKm(AALBORG, s) }))
    .sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title))
}

export const sameName = (a: string, b: string) =>
  a.localeCompare(b, 'da', { sensitivity: 'base' }) === 0
