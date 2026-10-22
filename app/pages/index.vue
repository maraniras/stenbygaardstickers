<script setup lang="ts">
import type { Map as LMap, Marker, MarkerClusterGroup } from 'leaflet'

definePageMeta({ keepalive: true })

const route = useRoute()
const router = useRouter()
const el = ref<HTMLElement>()
const selected = ref<Sticker>()
const playing = ref(false)
const playDate = ref('')

let map: LMap | undefined
let cluster: MarkerClusterGroup | undefined
const markers = new Map<string, Marker>()

function setActive(id: string | undefined) {
  for (const [key, m] of markers) m.getElement()?.classList.toggle('active', key === id)
}

function select(s: Sticker | undefined, fly = false) {
  selected.value = s
  setActive(s?.id)
  if (s && map) {
    if (fly) map.flyTo([s.lat, s.lng], Math.max(map.getZoom(), 14), { duration: 1.2 })
    else map.panTo([s.lat, s.lng])
  }
}

function fitAll() {
  if (!map) return
  if (!stickers.length) return map.setView([AALBORG.lat, AALBORG.lng], 4)
  if (stickers.length === 1) return map.setView([stickers[0]!.lat, stickers[0]!.lng], 12)
  map.fitBounds(stickers.map(s => [s.lat, s.lng] as [number, number]), { padding: [50, 50], maxZoom: 12 })
  // På en smal telefon kan hele verden ikke være der – vis så fra Aalborg og ud
  if (map.getZoom() <= map.getMinZoom()) map.setView([35, AALBORG.lng], map.getMinZoom())
}

function openFromQuery() {
  const id = route.query.s
  if (typeof id !== 'string') return
  const s = getSticker(id)
  if (!s || !map || !cluster) return
  const m = markers.get(id)!
  cluster.zoomToShowLayer(m, () => select(s))
  router.replace({ query: {} })
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

async function replay() {
  if (!map || !cluster) return
  if (playing.value) {
    playing.value = false
    return
  }
  playing.value = true
  select(undefined)
  cluster.clearLayers()
  map.setView([30, 10], 2)
  const ordered = [...stickers].reverse()
  const step = Math.min(900, Math.max(150, 8000 / ordered.length))
  await sleep(400)
  for (const s of ordered) {
    if (!playing.value) break
    playDate.value = s.date
    const m = markers.get(s.id)!
    cluster.addLayer(m)
    m.getElement()?.classList.add('pop')
    await sleep(step)
  }
  // Afbrudt eller færdig: vis alle igen
  cluster.addLayers([...markers.values()].filter(m => !cluster!.hasLayer(m)))
  playing.value = false
  playDate.value = ''
  fitAll()
}

onMounted(async () => {
  const L = (await import('leaflet')).default
  ;(window as any).L = L
  await import('leaflet.markercluster')

  map = L.map(el.value!, { zoomControl: false, worldCopyJump: true, minZoom: 2, attributionControl: true })
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
      iconSize: [42, 42],
    }),
  })

  const icon = L.divIcon({ className: 'head-pin', html: '<img src="/marker.png" alt="">', iconSize: [48, 48], iconAnchor: [24, 42] })
  for (const s of stickers) {
    const m = L.marker([s.lat, s.lng], { icon, title: s.title, riseOnHover: true })
    m.on('click', () => select(s))
    m.on('add', () => setActive(selected.value?.id))
    markers.set(s.id, m)
  }
  cluster.addLayers([...markers.values()])
  cluster.on('animationend', () => setActive(selected.value?.id))
  map.addLayer(cluster)
  map.on('click', () => select(undefined))

  fitAll()
  openFromQuery()
})

onActivated(() => {
  map?.invalidateSize()
  openFromQuery()
})

onBeforeUnmount(() => {
  playing.value = false
  map?.remove()
})
</script>

<template>
  <div class="page">
    <div ref="el" class="map" />

    <header class="top">
      <div class="brand">
        <img src="/logo.png" alt="">
        <h1>Stenbygaard <span>Stickers</span></h1>
      </div>
      <div class="stats">
        <span class="chip"><b>{{ stats.count }}</b> stickers</span>
        <span class="chip"><b>{{ stats.countries }}</b> {{ stats.countries === 1 ? 'land' : 'lande' }}</span>
        <button v-if="stats.farthest" class="chip far" @click="select(stats.farthest, true)">
          Længst væk: <CountryFlag :code="stats.farthest.countryCode" /> {{ stats.farthest.city }} · {{ formatKm(stats.farthest.distanceKm) }}
        </button>
      </div>
    </header>

    <div class="tools" :class="{ raised: selected }">
      <div v-if="playing && playDate" class="chip play-date">{{ formatDate(playDate) }}</div>
      <button v-if="stickers.length > 1" class="round" :aria-label="playing ? 'Stop' : 'Afspil tidslinje'" @click="replay">
        <svg v-if="!playing" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
        <svg v-else viewBox="0 0 24 24"><path d="M7 6h4v12H7zM13 6h4v12h-4z" /></svg>
      </button>
      <button class="round" aria-label="Vis alle" @click="select(undefined); fitAll()">
        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2" /><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18" fill="none" stroke="currentColor" stroke-width="2" /></svg>
      </button>
    </div>

    <Transition name="sheet">
      <StickerSheet v-if="selected" :key="selected.id" :sticker="selected" @close="select(undefined)" />
    </Transition>

    <div v-if="!stickers.length" class="empty chip">Ingen stickers endnu</div>
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
  padding: calc(10px + var(--safe-t)) 12px 0;
  pointer-events: none;
}
.top > * { pointer-events: auto; }
.brand {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 14px 4px 4px;
  border: 2.5px solid var(--ink);
  border-radius: 999px;
  background: var(--yellow);
  box-shadow: 3px 3px 0 var(--ink);
}
.brand img {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #fff;
  object-fit: contain;
}
.brand h1 { font-size: 19px; }
.brand h1 span { font-weight: 600; }
.stats {
  display: flex;
  gap: 6px;
  margin: 10px -12px 0;
  padding: 0 12px 6px;
  overflow-x: auto;
  scrollbar-width: none;
}
.stats::-webkit-scrollbar { display: none; }
.stats .chip { box-shadow: 2px 2px 0 var(--ink); }
.far {
  background: var(--ink);
  color: #fff;
  cursor: pointer;
}
.tools {
  position: absolute;
  right: 12px;
  bottom: 16px;
  z-index: 500;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: bottom .25s;
}
.tools.raised { bottom: 190px; }
.round {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  padding: 0;
  border: 2.5px solid var(--ink);
  border-radius: 50%;
  background: #fff;
  box-shadow: 3px 3px 0 var(--ink);
  cursor: pointer;
}
.round:active { transform: translate(2px, 2px); box-shadow: 1px 1px 0 var(--ink); }
.round svg { width: 24px; height: 24px; fill: currentColor; }
.play-date {
  font-size: 15px;
  font-weight: 800;
  box-shadow: 2px 2px 0 var(--ink);
}
.empty {
  position: absolute;
  left: 50%;
  top: 50%;
  z-index: 500;
  transform: translate(-50%, -50%);
}
.sheet-enter-active, .sheet-leave-active { transition: transform .25s, opacity .25s; }
.sheet-enter-from, .sheet-leave-to { transform: translateY(30px); opacity: 0; }
</style>
