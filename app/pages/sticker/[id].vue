<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const sticker = computed(() => getSticker(String(route.params.id)))
const index = ref(0)
const track = ref<HTMLElement>()

useHead(() => ({ title: sticker.value ? `${sticker.value.title} · Stenbygaard Stickers` : 'Stenbygaard Stickers' }))

function onScroll() {
  const t = track.value
  if (t) index.value = Math.round(t.scrollLeft / t.clientWidth)
}

function goTo(i: number) {
  track.value?.scrollTo({ left: i * track.value.clientWidth, behavior: 'smooth' })
}

function back() {
  if (window.history.state?.back) router.back()
  else router.push('/')
}

// Stop videoer der ikke er i fokus
watch(index, (i) => {
  track.value?.querySelectorAll('video').forEach((v) => {
    if (Number(v.dataset.i) !== i) v.pause()
  })
})
</script>

<template>
  <div v-if="sticker" class="page">
    <div class="gallery" :class="{ empty: !sticker.media.length }">
      <div v-if="sticker.media.length" ref="track" class="track" @scroll.passive="onScroll">
        <div v-for="(m, i) in sticker.media" :key="m.src" class="slide">
          <video
            v-if="m.type === 'video'"
            :data-i="i"
            :src="m.src"
            :poster="m.poster"
            controls
            playsinline
            loop
            preload="metadata"
          />
          <img v-else :src="m.src" :width="m.width" :height="m.height" alt="" :loading="i ? 'lazy' : 'eager'">
        </div>
      </div>
      <img v-else class="placeholder" src="/marker.png" alt="">

      <button class="back" aria-label="Tilbage" @click="back">
        <svg viewBox="0 0 24 24"><path d="M15 5 8 12l7 7" /></svg>
      </button>
      <div v-if="sticker.media.length > 1" class="dots">
        <button v-for="(m, i) in sticker.media" :key="m.src" :class="{ on: i === index }" :aria-label="`Medie ${i + 1}`" @click="goTo(i)" />
      </div>
    </div>

    <article class="body">
      <div class="place">
        <span class="chip"><CountryFlag :code="sticker.countryCode" /> {{ sticker.city }}</span>
        <span class="chip">{{ sticker.country }}</span>
      </div>
      <h1>{{ sticker.title }}</h1>

      <dl class="facts">
        <div><dt>Dato</dt><dd>{{ formatDate(sticker.date) }}</dd></div>
        <div v-if="sticker.placedBy.length"><dt>Sat op af</dt><dd>{{ formatNames(sticker.placedBy) }}</dd></div>
        <div><dt>Fra Aalborg</dt><dd>{{ formatKm(sticker.distanceKm) }}</dd></div>
      </dl>

      <p v-if="sticker.description" class="desc">{{ sticker.description }}</p>

      <div class="actions">
        <a class="btn" :href="googleMapsUrl(sticker)" target="_blank" rel="noopener">Åbn i Google Maps</a>
        <NuxtLink class="btn secondary" :to="{ path: '/', query: { s: sticker.id } }">Vis på kortet</NuxtLink>
      </div>
      <p class="coords">{{ sticker.lat.toFixed(5) }}, {{ sticker.lng.toFixed(5) }}</p>
    </article>
  </div>

  <div v-else class="missing">
    <img src="/marker.png" alt="">
    <h1>Sticker ikke fundet</h1>
    <NuxtLink class="btn" to="/">Til kortet</NuxtLink>
  </div>
</template>

<style scoped>
.page {
  max-width: 640px;
  margin: 0 auto;
  padding-bottom: 32px;
}
.gallery {
  position: relative;
  background: #111;
}
.gallery.empty {
  display: grid;
  place-items: center;
  height: calc(180px + var(--safe-t));
  background: var(--yellow);
  border-bottom: 2.5px solid var(--ink);
}
.placeholder { width: 120px; height: 120px; object-fit: contain; margin-top: var(--safe-t); }
.track {
  display: flex;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
}
.track::-webkit-scrollbar { display: none; }
.slide {
  flex: none;
  width: 100%;
  height: min(62vh, 560px);
  scroll-snap-align: center;
  display: grid;
  place-items: center;
}
.slide img, .slide video {
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #111;
}
.back {
  position: absolute;
  top: calc(12px + var(--safe-t));
  left: 12px;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  padding: 0;
  border: 2.5px solid var(--ink);
  border-radius: 50%;
  background: #fff;
  box-shadow: 2px 2px 0 var(--ink);
  cursor: pointer;
}
.back svg { width: 22px; height: 22px; fill: none; stroke: currentColor; stroke-width: 2.6; stroke-linecap: round; stroke-linejoin: round; }
.dots {
  position: absolute;
  left: 50%;
  bottom: 10px;
  display: flex;
  gap: 6px;
  padding: 5px 8px;
  border-radius: 999px;
  background: rgba(0, 0, 0, .45);
  transform: translateX(-50%);
}
.dots button {
  width: 8px;
  height: 8px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, .5);
  cursor: pointer;
}
.dots button.on { background: #fff; }
.body { padding: 18px 16px 0; }
.place { display: flex; flex-wrap: wrap; gap: 6px; }
h1 {
  margin-top: 12px;
  font-size: 30px;
  overflow-wrap: anywhere;
}
.facts {
  display: grid;
  gap: 8px;
  margin: 16px 0 0;
  padding: 14px 16px;
  border: 2.5px solid var(--ink);
  border-radius: 14px;
  background: #fff;
}
.facts div { display: flex; justify-content: space-between; gap: 16px; }
dt { color: var(--muted); font-weight: 600; }
dd { margin: 0; font-weight: 800; text-align: right; }
.desc {
  margin: 18px 0 0;
  font-size: 17px;
  white-space: pre-line;
}
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 22px;
}
.actions .btn { flex: 1 1 180px; }
.coords {
  margin: 14px 0 0;
  font-size: 13px;
  color: var(--muted);
  text-align: center;
  font-variant-numeric: tabular-nums;
}
.missing {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  height: 100%;
  padding: 24px;
}
.missing img { width: 100px; }
</style>
