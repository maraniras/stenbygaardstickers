// Emils rejse: starter hjemme i Aalborg og tegner en buet, prikket streg til hver
// sticker i datoorden, mens et Emil-hoved flyver langs stregen og kortet følger med.
// Hver sticker får en nål, når hovedet lander. Kan stoppes med en AbortSignal.
import type * as Leaflet from 'leaflet'

/** Hjemme – her starter rejsen */
export const JOURNEY_START = { lat: 57.042237, lng: 9.914973 }

export interface JourneyStop {
  lat: number
  lng: number
  /** Sticker-id – hjemmet har intet */
  id?: string
}

const wait = (ms: number, signal: AbortSignal) => new Promise<void>((resolve, reject) => {
  const t = setTimeout(resolve, ms)
  signal.addEventListener('abort', () => {
    clearTimeout(t)
    reject(new DOMException('Stoppet', 'AbortError'))
  }, { once: true })
})

/** Venter på at kortet er færdigt med at flyve (med sikkerhedsnet hvis det ikke flytter sig) */
function flyTo(map: Leaflet.Map, bounds: Leaflet.LatLngBounds, signal: AbortSignal) {
  return Promise.race([
    new Promise<void>((resolve) => {
      map.once('moveend', () => resolve())
      // Plads til overskriften foroven og rejsekortet + menuen forneden
      map.flyToBounds(bounds, { paddingTopLeft: [50, 150], paddingBottomRight: [50, 300], maxZoom: 15, duration: 1.2 })
    }),
    wait(2500, signal),
  ])
}

/** Punkter på en blød bue fra a til b (kvadratisk bezier) */
function arc(a: JourneyStop, b: JourneyStop, n = 60): [number, number][] {
  const dLat = b.lat - a.lat
  const dLng = b.lng - a.lng
  const c = { lat: (a.lat + b.lat) / 2 - dLng * 0.18, lng: (a.lng + b.lng) / 2 + dLat * 0.18 }
  const pts: [number, number][] = []
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const u = 1 - t
    pts.push([u * u * a.lat + 2 * u * t * c.lat + t * t * b.lat, u * u * a.lng + 2 * u * t * c.lng + t * t * b.lng])
  }
  return pts
}

const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2)

function draw(trail: Leaflet.Polyline, mover: Leaflet.Marker, pts: [number, number][], ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const start = performance.now()
    let frame = 0
    signal.addEventListener('abort', () => {
      cancelAnimationFrame(frame)
      reject(new DOMException('Stoppet', 'AbortError'))
    }, { once: true })
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / ms)
      const i = Math.round(ease(t) * (pts.length - 1))
      trail.setLatLngs(pts.slice(0, i + 1))
      mover.setLatLng(pts[i]!)
      if (t < 1) frame = requestAnimationFrame(step)
      else resolve()
    }
    frame = requestAnimationFrame(step)
  })
}

export async function playJourney(
  L: typeof Leaflet,
  map: Leaflet.Map,
  group: Leaflet.LayerGroup,
  stops: JourneyStop[],
  onArrive: (index: number) => void,
  onPinClick: (id: string) => void,
  signal: AbortSignal,
) {
  const pin = L.divIcon({ className: 'head-pin journey-pin', html: '<div class="pin"><img src="/marker.png" alt=""></div>', iconSize: [46, 46], iconAnchor: [23, 41] })
  const head = L.divIcon({ className: 'journey-head', html: '<div class="pin"><img src="/marker.png" alt=""></div>', iconSize: [40, 40], iconAnchor: [20, 20] })
  const home = L.divIcon({ className: 'journey-home', html: '<span>🏠</span>', iconSize: [34, 34], iconAnchor: [17, 17] })
  const line = { color: '#111114', weight: 3, opacity: 0.85, dashArray: '1 9', lineCap: 'round' as const }

  const first = stops[0]!
  L.marker([first.lat, first.lng], { icon: home, interactive: false }).addTo(group)
  await flyTo(map, L.latLngBounds([[first.lat, first.lng], [first.lat, first.lng]]).pad(0.5), signal)
  onArrive(0)
  await wait(1200, signal)

  for (let i = 1; i < stops.length; i++) {
    const a = stops[i - 1]!
    const b = stops[i]!
    await flyTo(map, L.latLngBounds([[a.lat, a.lng], [b.lat, b.lng]]), signal)
    const trail = L.polyline([], line).addTo(group)
    const mover = L.marker([a.lat, a.lng], { icon: head, interactive: false, zIndexOffset: 1000 }).addTo(group)
    // Lange ture tager lidt længere tid end korte
    const km = distanceKm(a, b)
    await draw(trail, mover, arc(a, b), Math.min(3200, Math.max(1100, 900 + km * 1.4)), signal)
    mover.remove()
    const m = L.marker([b.lat, b.lng], { icon: pin }).addTo(group)
    if (b.id) m.on('click', () => onPinClick(b.id!))
    onArrive(i)
    await wait(1400, signal)
  }

  const all = L.latLngBounds(stops.map(s => [s.lat, s.lng] as [number, number]))
  await flyTo(map, all, signal)
}
