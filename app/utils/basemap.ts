// Baggrundskort: OpenStreetMap (standard) eller luftfoto fra Esri World Imagery med
// by- og vejnavne ovenpå. Esri dækker hele verden – danske ortofotos kun Danmark.
// Valget huskes i browseren og deles mellem kortet og upload-kortvælgeren.
import type * as Leaflet from 'leaflet'

export type Basemap = 'kort' | 'luftfoto'

const KEY = 'stenbygaard-basemap'
const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services'

export function useBasemap() {
  const basemap = useState<Basemap>('basemap', () => {
    try {
      return localStorage.getItem(KEY) === 'luftfoto' ? 'luftfoto' : 'kort'
    } catch {
      return 'kort'
    }
  })
  function toggle() {
    basemap.value = basemap.value === 'kort' ? 'luftfoto' : 'kort'
    try {
      localStorage.setItem(KEY, basemap.value)
    } catch {}
  }
  return { basemap, toggle }
}

/** Lægger det valgte baggrundskort på og skifter, når valget ændres */
export function attachBasemap(L: typeof Leaflet, map: Leaflet.Map, basemap: Ref<Basemap>) {
  const layers: Record<Basemap, Leaflet.Layer> = {
    kort: L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }),
    luftfoto: L.layerGroup([
      L.tileLayer(`${ESRI}/World_Imagery/MapServer/tile/{z}/{y}/{x}`, {
        attribution: 'Luftfoto © Esri, Maxar, Earthstar Geographics',
        maxZoom: 19,
      }),
      L.tileLayer(`${ESRI}/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}`, {
        maxZoom: 19,
      }),
    ]),
  }
  let current: Basemap | undefined
  const show = (b: Basemap) => {
    if (current) map.removeLayer(layers[current])
    layers[b].addTo(map)
    current = b
    // Kortet gøres lidt gråt i main.css – luftfoto skal have sine farver
    map.getContainer().classList.toggle('satellite', b === 'luftfoto')
  }
  show(basemap.value)
  return watch(basemap, show)
}
