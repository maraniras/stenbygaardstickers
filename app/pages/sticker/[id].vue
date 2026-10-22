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
    <div class="hero" :class="{ empty: !sticker.media.length }">
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

      <button class="back glass" aria-label="Tilbage" @click="back">
        <svg viewBox="0 0 24 24"><path d="M15 5 8 12l7 7" /></svg>
      </button>
      <div v-if="sticker.media.length > 1" class="dots">
        <button v-for="(m, i) in sticker.media" :key="m.src" :class="{ on: i === index }" :aria-label="`Medie ${i + 1}`" @click="goTo(i)" />
      </div>
    </div>

    <article class="body">
      <div class="place"><CountryFlag :code="sticker.countryCode" /> {{ sticker.city }}, {{ sticker.country }}</div>
      <h1>{{ sticker.title }}</h1>
      <p class="date">{{ formatDate(sticker.date) }}</p>

      <div class="facts">
        <div class="fact">
          <span class="eyebrow">Fra Aalborg</span>
          <b>{{ formatKm(sticker.distanceKm) }}</b>
        </div>
        <div v-if="sticker.placedBy.length" class="fact">
          <span class="eyebrow">Sat op af</span>
          <div class="names">
            <NuxtLink v-for="n in sticker.placedBy" :key="n" class="chip person" :to="personUrl(n)">
              <span class="avatar">{{ n[0] }}</span>{{ n }}
            </NuxtLink>
          </div>
        </div>
      </div>

      <p v-if="sticker.description" class="desc">{{ sticker.description }}</p>

      <StarRating :sticker-id="sticker.id" />

      <div class="actions">
        <a class="btn" :href="googleMapsUrl(sticker)" target="_blank" rel="noopener">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z" /><circle cx="12" cy="9.5" r="2.5" /></svg>
          Google Maps
        </a>
        <NuxtLink class="btn secondary" :to="{ path: '/', query: { s: sticker.id } }">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4 3 6.5v13.5l6-2.5 6 2.5 6-2.5V4l-6 2.5L9 4Zm0 0v13.5m6-11V20" /></svg>
          Vis på kortet
        </NuxtLink>
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
  padding-bottom: var(--nav-space);
}
.hero {
  position: relative;
  background: #0d0d0f;
}
.hero.empty {
  display: grid;
  place-items: center;
  height: calc(220px + var(--safe-t));
  background: linear-gradient(160deg, #ffe07a, var(--accent));
}
.placeholder {
  width: 130px;
  height: 130px;
  object-fit: contain;
  margin-top: var(--safe-t);
  filter: drop-shadow(0 8px 14px rgba(0, 0, 0, .25));
}
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
  height: min(68vh, 620px);
  scroll-snap-align: center;
}
.slide img, .slide video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  background: #0d0d0f;
}
.slide video { object-fit: contain; }
.back {
  position: absolute;
  top: calc(12px + var(--safe-t));
  left: 12px;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  cursor: pointer;
}
.back svg { width: 22px; height: 22px; fill: none; stroke: currentColor; stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; }
.dots {
  position: absolute;
  left: 50%;
  bottom: 40px;
  display: flex;
  gap: 6px;
  padding: 6px 9px;
  border-radius: 999px;
  background: rgba(0, 0, 0, .35);
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
  transform: translateX(-50%);
}
.dots button {
  width: 7px;
  height: 7px;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: rgba(255, 255, 255, .5);
  cursor: pointer;
  transition: width .2s;
}
.dots button.on { width: 18px; background: #fff; }
.body {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-top: -26px;
  padding: 24px 16px 0;
  border-radius: 28px 28px 0 0;
  background: var(--bg);
}
.hero.empty + .body { margin-top: -26px; }
.place {
  font-size: 14px;
  font-weight: 600;
  color: var(--muted);
}
h1 {
  margin-top: -8px;
  font-size: 32px;
  overflow-wrap: anywhere;
}
.date {
  margin: -10px 0 0;
  color: var(--muted);
  font-weight: 500;
}
.facts {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 8px;
}
.fact {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px 16px;
  border-radius: 18px;
  background: var(--surface);
  box-shadow: var(--shadow-sm);
}
.fact b { font-size: 18px; white-space: nowrap; }
.names {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.person {
  padding: 3px 10px 3px 3px;
  font-size: 14px;
}
.avatar {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--accent);
  font-size: 12px;
  font-weight: 800;
}
.desc {
  margin: 4px 0;
  font-size: 17px;
  line-height: 1.6;
  white-space: pre-line;
}
.actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.actions .btn {
  padding: 0 12px;
  font-size: 15px;
  white-space: nowrap;
}
.coords {
  margin: 0;
  font-size: 12px;
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
