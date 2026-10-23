<script setup lang="ts">
import type { Map as LMap, Marker, MarkerClusterGroup } from 'leaflet'

definePageMeta({ keepalive: true })

const route = useRoute()
const router = useRouter()
const el = ref<HTMLElement>()
const selected = ref<Sticker>()

const person = computed(() => (typeof route.query.by === 'string' ? route.query.by : ''))
const visible = computed(() => (person.value ? stickersBy(person.value) : stickers))
const farthest = computed(() => visible.value.reduce<Sticker | undefined>((max, s) => (!max || s.distanceKm > max.distanceKm ? s : max), undefined))
const countries = computed(() => new Set(visible.value.map(s => s.countryCode)).size)

let map: LMap | undefined
let cluster: MarkerClusterGroup | undefined
const markers = new Map<string, Marker>()

function setActive(id: string | undefined) {
  for (const [key, m] of markers) m.getElement()?.classList.toggle('active', key === id)
}

/** Zoomer ind på stickeren, så den står over pop-up-kortet */
function flyTo(s: Sticker) {
  if (!map) return
  const z = Math.max(map.getZoom(), 16)
  const p = map.project([s.lat, s.lng], z).add([0, 90])
  map.flyTo(map.unproject(p, z), z, { duration: 1.1 })
}

function select(s: Sticker | undefined) {
  selected.value = s
  setActive(s?.id)
  if (s) flyTo(s)
}

function fitAll() {
  if (!map) return
  const list = visible.value
  if (!list.length) return map.setView([AALBORG.lat, AALBORG.lng], 4)
  if (list.length === 1) return map.setView([list[0]!.lat, list[0]!.lng], 5)
  map.fitBounds(list.map(s => [s.lat, s.lng] as [number, number]), { padding: [60, 60], maxZoom: 12 })
  // På en smal telefon kan hele verden ikke være der – vis så fra Aalborg og ud
  if (map.getZoom() <= map.getMinZoom()) map.setView([35, AALBORG.lng], map.getMinZoom())
}

function showVisible() {
  if (!cluster) return
  cluster.clearLayers()
  cluster.addLayers(visible.value.map(s => markers.get(s.id)!))
  if (selected.value && !visible.value.includes(selected.value)) select(undefined)
  fitAll()
}

function openFromQuery() {
  const id = route.query.s
  if (typeof id !== 'string') return
  const s = getSticker(id)
  if (!s || !map) return
  select(s)
  const { s: _, ...rest } = route.query
  router.replace({ query: rest })
}

function clearPerson() {
  router.replace({ query: {} })
}

watch(person, showVisible)

onMounted(async () => {
  const L = (await import('leaflet')).default
  ;(window as any).L = L
  await import('leaflet.markercluster')

  map = L.map(el.value!, { zoomControl: false, worldCopyJump: true, minZoom: 2 })
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(map)
  map.attributionControl.setPrefix(false)

  cluster = L.markerClusterGroup({
    showCoverageOnHover: false,
    maxClusterRadius: 50,
    iconCreateFunction: c => L.divIcon({
      className: 'sticker-cluster',
      html: `<div>${c.getChildCount()}</div>`,
      iconSize: [44, 44],
    }),
  })

  const icon = L.divIcon({ className: 'head-pin', html: '<img src="/marker.png" alt="">', iconSize: [52, 52], iconAnchor: [26, 46] })
  for (const s of stickers) {
    const m = L.marker([s.lat, s.lng], { icon, title: s.title, riseOnHover: true })
    m.on('click', () => select(s))
    m.on('add', () => setActive(selected.value?.id))
    markers.set(s.id, m)
  }
  cluster.on('animationend', () => setActive(selected.value?.id))
  map.addLayer(cluster)
  map.on('click', () => select(undefined))

  showVisible()
  openFromQuery()
})

onActivated(() => {
  map?.invalidateSize()
  openFromQuery()
})

onBeforeUnmount(() => {
  map?.remove()
})
</script>

<template>
  <div class="page">
    <div ref="el" class="map" />

    <header class="top">
      <RefreshButton class="refresh-btn" />
      <div class="brand glass">
        <img src="/logo.png" alt="">
        <div>
          <h1>Stenbygaard Stickers</h1>
          <p>{{ visible.length }} {{ visible.length === 1 ? 'sticker' : 'stickers' }} · {{ countries }} {{ countries === 1 ? 'land' : 'lande' }}</p>
        </div>
      </div>
      <div class="chips">
        <button v-if="person" class="chip glass filter" @click="clearPerson">
          Sat op af {{ person }}
          <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18" /></svg>
        </button>
        <button v-if="farthest" class="chip glass" @click="select(farthest)">
          <span class="muted">Længst væk</span>
          <CountryFlag :code="farthest.countryCode" /> {{ farthest.city }} · {{ formatKm(farthest.distanceKm) }}
        </button>
      </div>
    </header>

    <button class="round glass" :class="{ raised: selected }" aria-label="Vis alle" @click="select(undefined); fitAll()">
      <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18" /></svg>
    </button>

    <Transition name="sheet">
      <StickerSheet v-if="selected" :key="selected.id" :sticker="selected" @close="select(undefined)" />
    </Transition>

    <div v-if="!visible.length" class="empty chip glass">{{ person ? `Ingen stickers fra ${person}` : 'Ingen stickers endnu' }}</div>
  </div>
</template>

<style scoped>
.page {
  position: relative;
  height: 100%;
  overflow: hidden;
}
.map {
  position: absolute;
  inset: 0;
  z-index: 0;
}
.top {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 500;
  padding: calc(12px + var(--safe-t)) 12px 0;
  pointer-events: none;
}
.top > * { pointer-events: auto; }
.refresh-btn {
  position: absolute;
  top: calc(16px + var(--safe-t));
  right: 12px;
}
.brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 6px 18px 6px 6px;
  border-radius: 999px;
}
.brand img {
  width: 44px;
  height: 44px;
  padding: 3px;
  border-radius: 50%;
  background: linear-gradient(160deg, #ffe07a, var(--accent));
  object-fit: contain;
}
.brand h1 { font-size: 16px; }
.brand p {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  color: var(--muted);
}
.chips {
  display: flex;
  gap: 8px;
  margin: 10px -12px 0;
  padding: 0 12px 10px;
  overflow-x: auto;
  scrollbar-width: none;
  pointer-events: none;
}
.chips::-webkit-scrollbar { display: none; }
.chips .chip {
  pointer-events: auto;
  padding: 8px 14px;
  box-shadow: var(--shadow-sm);
}
.muted { color: var(--muted); }
.filter {
  background: var(--text) !important;
  color: #fff;
}
.filter svg {
  width: 14px;
  height: 14px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.6;
  stroke-linecap: round;
}
.round {
  position: absolute;
  right: 12px;
  bottom: var(--nav-space);
  z-index: 500;
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  cursor: pointer;
  transition: opacity .2s;
}
.round.raised { opacity: 0; pointer-events: none; }
.round svg {
  width: 22px;
  height: 22px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
}
.empty {
  position: absolute;
  left: 50%;
  top: 50%;
  z-index: 500;
  transform: translate(-50%, -50%);
}
.sheet-enter-active, .sheet-leave-active { transition: transform .3s cubic-bezier(.2, .9, .3, 1), opacity .25s; }
.sheet-enter-from, .sheet-leave-to { transform: translateY(40px); opacity: 0; }
</style>
