<script setup lang="ts">
// Verdenskort hvor de lande, Emil har været i, er farvet (stærkere jo flere stickers),
// og en liste over landene. Kortdata (world-atlas, ~100 kB) hentes først her.
import type { GeoJSON as LGeoJSON, Map as LMap } from 'leaflet'

const router = useRouter()
const { stickers } = useStickers()
const el = ref<HTMLElement>()
const loading = ref(true)

const countries = computed(() => {
  const map = new Map<string, { code: string, name: string, count: number, cities: Set<string>, people: Set<string> }>()
  for (const s of stickers.value) {
    const c = map.get(s.countryCode) ?? { code: s.countryCode, name: s.country, count: 0, cities: new Set(), people: new Set() }
    c.count++
    c.cities.add(s.city)
    s.placedBy.forEach(n => c.people.add(n))
    map.set(s.countryCode, c)
  }
  return [...map.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'da'))
})

useHead({ title: 'Lande · Stenbygaard Stickers' })

let map: LMap | undefined
let layer: LGeoJSON | undefined
const bounds = new Map<string, import('leaflet').LatLngBounds>()

function color(count: number) {
  const max = Math.max(1, ...countries.value.map(c => c.count))
  return 0.45 + 0.55 * (count / max)
}

function focus(code: string) {
  const b = bounds.get(code)
  if (map && b) map.flyToBounds(b, { padding: [20, 20], maxZoom: 5, duration: 0.8 })
}

onMounted(async () => {
  const [L, topo, { feature }, iso] = await Promise.all([
    import('leaflet').then(m => m.default),
    import('world-atlas/countries-110m.json').then(m => m.default as any),
    import('topojson-client'),
    import('i18n-iso-countries').then(m => m.default),
  ])
  const geo = feature(topo, topo.objects.countries) as unknown as GeoJSON.FeatureCollection
  const byCode = new Map(countries.value.map(c => [c.code, c]))
  const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#ffc928'

  map = L.map(el.value!, { zoomControl: false, attributionControl: false, worldCopyJump: true, minZoom: 1, maxZoom: 6 })
  layer = L.geoJSON(geo, {
    style: (f) => {
      const c = byCode.get(iso.numericToAlpha2(String(f?.id ?? '')) ?? '')
      return c
        ? { fillColor: accent, fillOpacity: color(c.count), color: '#fff', weight: 0.8 }
        : { fillColor: '#d9d9de', fillOpacity: 1, color: '#fff', weight: 0.6 }
    },
    onEachFeature: (f, l) => {
      const code = iso.numericToAlpha2(String(f.id ?? ''))
      const c = code ? byCode.get(code) : undefined
      if (!c || !code) return
      bounds.set(code, (l as any).getBounds())
      l.bindTooltip(`${c.name} · ${c.count} ${c.count === 1 ? 'sticker' : 'stickers'}`, { sticky: true })
    },
  }).addTo(map)

  // Vis de besøgte lande, men aldrig mere end hele verden
  const visited = [...bounds.values()]
  if (visited.length) {
    const all = visited.reduce((a, b) => a.extend(b), L.latLngBounds(visited[0]!.getSouthWest(), visited[0]!.getNorthEast()))
    map.fitBounds(all.pad(0.6), { maxZoom: 4 })
  }
  else {
    map.setView([30, 10], 1)
  }
  loading.value = false
})

onBeforeUnmount(() => map?.remove())

function back() {
  if (window.history.state?.back) router.back()
  else router.push('/liste')
}
</script>

<template>
  <div class="page">
    <button class="back" aria-label="Tilbage" @click="back">
      <svg viewBox="0 0 24 24"><path d="M15 5 8 12l7 7" /></svg>
    </button>

    <header>
      <h1>Lande</h1>
      <p class="sub"><b>{{ countries.length }}</b> af 195 lande i verden</p>
      <div class="progress"><span :style="{ width: `${Math.max(2, countries.length / 195 * 100)}%` }" /></div>
    </header>

    <div class="world">
      <div ref="el" class="map" />
      <p v-if="loading" class="loading">Henter verdenskortet…</p>
    </div>

    <ul class="list">
      <li v-for="c in countries" :key="c.code">
        <button @click="focus(c.code)">
          <CountryFlag :code="c.code" class="flag" />
          <span class="name">
            <b>{{ c.name }}</b>
            <span>{{ [...c.cities].join(', ') }}</span>
          </span>
          <span class="n">{{ c.count }}</span>
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.page {
  max-width: 640px;
  margin: 0 auto;
  padding: calc(20px + var(--safe-t)) 16px var(--nav-space);
}
.back {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: var(--surface);
  box-shadow: var(--shadow-sm);
  cursor: pointer;
}
.back svg { width: 22px; height: 22px; fill: none; stroke: currentColor; stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; }
header { margin: 14px 0 16px; }
h1 { font-size: 34px; }
.sub { margin: 4px 0 10px; color: var(--muted); }
.sub b { color: var(--text); }
.progress {
  height: 6px;
  border-radius: 999px;
  background: var(--surface-2);
  overflow: hidden;
}
.progress span {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: var(--accent);
}
.world {
  position: relative;
  height: 260px;
  border-radius: var(--radius);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}
.map {
  position: absolute;
  inset: 0;
  z-index: 0;
  background: #eef3f8;
}
.loading {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  margin: 0;
  color: var(--muted);
  font-weight: 600;
}
.list {
  display: grid;
  gap: 8px;
  margin: 16px 0 0;
  padding: 0;
  list-style: none;
}
.list button {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px 14px;
  border: 0;
  border-radius: 16px;
  background: var(--surface);
  box-shadow: var(--shadow-sm);
  text-align: left;
  cursor: pointer;
}
.flag { flex: none; transform: scale(1.4); margin: 0 4px; }
.name { display: flex; flex-direction: column; flex: 1; min-width: 0; }
.name span { font-size: 13px; color: var(--muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.n {
  min-width: 28px;
  padding: 2px 9px;
  border-radius: 999px;
  background: var(--accent);
  color: var(--on-accent);
  text-align: center;
  font-weight: 800;
}
</style>
