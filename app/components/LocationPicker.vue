<script setup lang="ts">
import type { Map as LMap, Marker } from 'leaflet'

// Kort hvor man trykker (eller trækker nålen) for at vælge stedet. Koordinatet kan
// også skrives eller indsættes direkte fra Google Maps: "55.676098, 12.568337".
const model = defineModel<{ lat: number, lng: number } | null>({ required: true })
const props = defineProps<{ locate?: boolean }>()

const el = ref<HTMLElement>()
const { basemap, toggle: toggleBasemap } = useBasemap()
const text = ref(model.value ? formatCoords(model.value.lat, model.value.lng) : '')
const invalid = ref(false)
const locating = ref(false)
const locateError = ref('')

let map: LMap | undefined
let marker: Marker | undefined
let L: typeof import('leaflet') | undefined

function place(lat: number, lng: number, opts: { fly?: boolean, zoom?: number } = {}) {
  model.value = { lat, lng }
  text.value = formatCoords(lat, lng)
  invalid.value = false
  locateError.value = ''
  if (!map || !L) return
  if (!marker) {
    const icon = L.divIcon({ className: 'head-pin', html: '<img src="/marker.png" alt="">', iconSize: [48, 48], iconAnchor: [24, 42] })
    marker = L.marker([lat, lng], { icon, draggable: true }).addTo(map)
    marker.on('dragend', () => {
      const p = marker!.getLatLng()
      place(p.lat, p.lng)
    })
  }
  else {
    marker.setLatLng([lat, lng])
  }
  if (opts.fly) map.setView([lat, lng], opts.zoom ?? Math.max(map.getZoom(), 17))
}

function onText() {
  const c = parseCoords(text.value)
  invalid.value = Boolean(text.value.trim()) && !c
  if (c) place(c.lat, c.lng, { fly: true })
}

function locate() {
  if (!navigator.geolocation) {
    locateError.value = 'Din browser kan ikke finde din position'
    return
  }
  locating.value = true
  locateError.value = ''
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      locating.value = false
      place(pos.coords.latitude, pos.coords.longitude, { fly: true, zoom: 18 })
    },
    () => {
      locating.value = false
      locateError.value = 'Kunne ikke finde din position – tryk på kortet i stedet'
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
  )
}

onMounted(async () => {
  L = (await import('leaflet')).default
  map = L.map(el.value!, { zoomControl: false })
  map.attributionControl.setPrefix(false)
  attachBasemap(L, map, basemap)
  L.control.zoom({ position: 'bottomright' }).addTo(map)
  map.on('click', e => place(e.latlng.lat, e.latlng.lng))

  if (model.value) {
    map.setView([model.value.lat, model.value.lng], 16)
    place(model.value.lat, model.value.lng)
  }
  else {
    map.setView([AALBORG.lat, AALBORG.lng], 5)
    if (props.locate) locate()
  }
})

// Når admin skifter til en anden sticker
watch(model, (v) => {
  if (v && marker && (marker.getLatLng().lat !== v.lat || marker.getLatLng().lng !== v.lng)) place(v.lat, v.lng, { fly: true })
})

onBeforeUnmount(() => map?.remove())
</script>

<template>
  <div class="picker">
    <div ref="el" class="map" />
    <button type="button" class="me glass" :disabled="locating" @click="locate">
      <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.5" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /><circle cx="12" cy="12" r="7.5" /></svg>
      {{ locating ? 'Finder dig…' : 'Min position' }}
    </button>
    <button type="button" class="layers glass" :class="{ on: basemap === 'luftfoto' }" @click="toggleBasemap">
      <svg viewBox="0 0 24 24"><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 13 9 5 9-5" /></svg>
      {{ basemap === 'kort' ? 'Luftfoto' : 'Kort' }}
    </button>
    <p v-if="!model" class="hint">Tryk på kortet, hvor stickeren sidder</p>
  </div>
  <label class="coords">
    <span class="eyebrow">Koordinat</span>
    <input
      v-model="text"
      :class="{ invalid }"
      inputmode="decimal"
      placeholder="55.676098, 12.568337"
      autocomplete="off"
      @change="onText"
      @paste="nextTick(onText)"
    >
  </label>
  <p v-if="invalid" class="err">Skriv det som i Google Maps, fx 55.676098, 12.568337</p>
  <p v-else-if="locateError" class="err">{{ locateError }}</p>
</template>

<style scoped>
.picker {
  position: relative;
  height: 280px;
  border-radius: 18px;
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}
.map {
  position: absolute;
  inset: 0;
  z-index: 0;
}
.me {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 500;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border: 0;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}
.me svg, .layers svg { width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.layers {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 500;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border: 0;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}
.layers.on { background: var(--text); color: #fff; }
.hint {
  position: absolute;
  left: 50%;
  bottom: 12px;
  z-index: 500;
  margin: 0;
  padding: 6px 12px;
  border-radius: 999px;
  background: var(--text);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  transform: translateX(-50%);
  pointer-events: none;
}
.coords {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 10px;
}
.coords input { font-variant-numeric: tabular-nums; }
.err {
  margin: 6px 0 0;
  color: #c62828;
  font-size: 13px;
  font-weight: 600;
}
</style>
