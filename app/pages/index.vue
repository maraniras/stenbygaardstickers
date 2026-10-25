<script setup lang="ts">
import type { LayerGroup, Map as LMap, Marker, MarkerClusterGroup } from 'leaflet'

definePageMeta({ keepalive: true })

const route = useRoute()
const router = useRouter()
const el = ref<HTMLElement>()
const selected = ref<Sticker>()
const { stickers, stickersBy, getSticker } = useStickers()
const { basemap, toggle: toggleBasemap } = useBasemap()

const person = computed(() => (typeof route.query.by === 'string' ? route.query.by : ''))
const visible = computed(() => (person.value ? stickersBy(person.value) : stickers.value))
const farthest = computed(() => visible.value.reduce<Sticker | undefined>((max, s) => (!max || s.distanceKm > max.distanceKm ? s : max), undefined))
const countries = computed(() => new Set(visible.value.map(s => s.countryCode)).size)

let map: LMap | undefined
let cluster: MarkerClusterGroup | undefined
const markers = new Map<string, Marker>()
let buildMarkers: (() => void) | undefined

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

function showVisible(fit = true) {
  if (!cluster) return
  cluster.clearLayers()
  cluster.addLayers(visible.value.map(s => markers.get(s.id)!))
  if (selected.value && !visible.value.includes(selected.value)) select(undefined)
  if (fit) fitAll()
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

// Emils rejse (app/utils/journey.ts). Mens den kører, er de almindelige nåle skjult.
let Lf: typeof import('leaflet') | undefined
let journeyAbort: AbortController | undefined
let journeyLayer: LayerGroup | undefined
const journey = ref<{ list: Sticker[], index: number, done: boolean }>()

const journeyKm = computed(() => {
  const list = journey.value?.list ?? []
  const out = [0]
  list.forEach((s, i) => out.push(out[i]! + distanceKm(i ? list[i - 1]! : JOURNEY_START, s)))
  return out
})
const journeyAt = computed(() => (journey.value?.index ? journey.value.list[journey.value.index - 1] : undefined))

async function startJourney() {
  if (!map || !Lf || !cluster) return
  stopJourney(false)
  select(undefined)
  const list = [...visible.value].sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title))
  journey.value = { list, index: 0, done: false }
  // Vue's proxy – så kan vi se, om det stadig er denne afspilning, der kører
  const run = journey.value
  journeyAbort = new AbortController()
  map.removeLayer(cluster)
  journeyLayer = Lf.layerGroup().addTo(map)
  try {
    await playJourney(
      Lf, map, journeyLayer,
      [JOURNEY_START, ...list.map(s => ({ lat: s.lat, lng: s.lng, id: s.id }))],
      (i) => { if (journey.value === run) journey.value.index = i },
      id => router.push(`/sticker/${id}`),
      journeyAbort.signal,
    )
    if (journey.value === run) journey.value.done = true
  }
  catch (err) {
    if ((err as Error).name !== 'AbortError') throw err
  }
}

function stopJourney(restore = true) {
  journeyAbort?.abort()
  journeyAbort = undefined
  journeyLayer?.remove()
  journeyLayer = undefined
  journey.value = undefined
  if (restore && map && cluster && !map.hasLayer(cluster)) {
    map.addLayer(cluster)
    fitAll()
  }
}

watch(person, () => {
  stopJourney()
  showVisible()
})

onMounted(async () => {
  const L = (await import('leaflet')).default
  Lf = L
  ;(window as any).L = L
  await import('leaflet.markercluster')

  map = L.map(el.value!, { zoomControl: false, worldCopyJump: true, minZoom: 2 })
  attachBasemap(L, map, basemap)
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

  const icon = L.divIcon({ className: 'head-pin', html: '<div class="pin"><img src="/marker.png" alt=""></div>', iconSize: [52, 52], iconAnchor: [26, 46] })
  buildMarkers = () => {
    markers.clear()
    for (const s of stickers.value) {
      const m = L.marker([s.lat, s.lng], { icon, title: s.title, riseOnHover: true })
      m.on('click', () => select(s))
      m.on('add', () => setActive(selected.value?.id))
      markers.set(s.id, m)
    }
  }
  buildMarkers()
  cluster.on('animationend', () => setActive(selected.value?.id))
  map.addLayer(cluster)
  map.on('click', () => select(undefined))

  showVisible()
  openFromQuery()
})

// Nye eller rettede stickers (automatisk hentet eller godkendt i admin). Kortet
// bliver stående, og en åben sticker forbliver åben.
watch(stickers, () => {
  if (!buildMarkers) return
  buildMarkers()
  const id = selected.value?.id
  if (id) selected.value = visible.value.find(s => s.id === id)
  showVisible(false)
  setActive(selected.value?.id)
})

onDeactivated(() => stopJourney())

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
      <div class="top-actions">
        <UploadButton />
        <RefreshButton />
      </div>
      <div class="brand glass">
        <img src="/logo.png" alt="">
        <div>
          <h1>Stenbygaard Stickers</h1>
          <p>{{ visible.length }} {{ visible.length === 1 ? 'sticker' : 'stickers' }} · {{ countries }} {{ countries === 1 ? 'land' : 'lande' }}</p>
        </div>
      </div>
      <div v-if="!journey" class="chips">
        <button v-if="visible.length" class="chip glass play" @click="startJourney">
          <svg viewBox="0 0 24 24"><path d="M8 5.5v13l10.5-6.5Z" /></svg>
          {{ person ? `${genitive(person)} rejse` : 'Emils rejse' }}
        </button>
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

    <button
      class="round layers glass"
      :class="{ raised: selected || journey, on: basemap === 'luftfoto' }"
      :aria-label="basemap === 'kort' ? 'Vis luftfoto' : 'Vis kort'"
      :title="basemap === 'kort' ? 'Vis luftfoto' : 'Vis kort'"
      @click="toggleBasemap"
    >
      <svg viewBox="0 0 24 24"><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 13 9 5 9-5" /></svg>
    </button>

    <button class="round glass" :class="{ raised: selected || journey }" aria-label="Vis alle" @click="select(undefined); fitAll()">
      <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18" /></svg>
    </button>

    <Transition name="sheet">
      <StickerSheet v-if="selected" :key="selected.id" :sticker="selected" @close="select(undefined)" />
    </Transition>

    <Transition name="sheet">
      <div v-if="journey" class="journey glass">
        <div class="j-top">
          <span class="eyebrow">{{ person ? `${genitive(person)} rejse` : 'Emils rejse' }}</span>
          <span class="j-step">{{ journey.index }} / {{ journey.list.length }}</span>
        </div>
        <template v-if="journey.done">
          <b class="j-title">Hele rejsen: {{ formatKm(journeyKm[journeyKm.length - 1]!) }}</b>
          <span class="j-sub">{{ journey.list.length }} {{ journey.list.length === 1 ? 'sticker' : 'stickers' }} · tryk på en nål for at se den</span>
        </template>
        <template v-else-if="journeyAt">
          <b class="j-title"><CountryFlag :code="journeyAt.countryCode" /> {{ journeyAt.title }}</b>
          <span class="j-sub">{{ journeyAt.city }} · {{ formatDate(journeyAt.date) }} · {{ formatKm(journeyKm[journey.index]!) }} rejst</span>
        </template>
        <template v-else>
          <b class="j-title">Hjemme i Aalborg</b>
          <span class="j-sub">Her startede det hele</span>
        </template>
        <div class="j-bar"><span :style="{ width: `${(journey.index / journey.list.length) * 100}%` }" /></div>
        <div class="j-actions">
          <button v-if="journey.done" class="btn" @click="startJourney">Afspil igen</button>
          <button class="btn secondary" @click="stopJourney()">{{ journey.done ? 'Luk' : 'Stop' }}</button>
        </div>
      </div>
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
.top-actions {
  position: absolute;
  top: calc(16px + var(--safe-t));
  right: 12px;
  display: flex;
  gap: 8px;
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
  background: linear-gradient(160deg, var(--accent-light), var(--accent));
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
.play {
  background: var(--accent) !important;
  color: var(--on-accent);
  font-weight: 700;
}
.play svg { width: 14px; height: 14px; fill: currentColor; }
.journey {
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: var(--nav-space);
  z-index: 600;
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-width: 520px;
  margin: 0 auto;
  padding: 14px 16px;
  border-radius: var(--radius);
}
.j-top { display: flex; justify-content: space-between; align-items: center; }
.j-step { font-size: 13px; font-weight: 700; color: var(--muted); font-variant-numeric: tabular-nums; }
.j-title { display: flex; align-items: center; gap: 6px; font-size: 18px; }
.j-sub { font-size: 14px; color: var(--muted); }
.j-bar {
  height: 4px;
  margin: 8px 0 4px;
  border-radius: 999px;
  background: var(--surface-2);
  overflow: hidden;
}
.j-bar span {
  display: block;
  height: 100%;
  background: var(--ink);
  transition: width .4s;
}
.j-actions { display: flex; gap: 8px; margin-top: 6px; }
.j-actions .btn { flex: 1; min-height: 44px; font-size: 15px; }
.filter {
  background: var(--ink) !important;
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
  stroke-linejoin: round;
}
.round.layers { bottom: calc(var(--nav-space) + 58px); }
.round.layers.on {
  background: var(--ink);
  color: #fff;
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
