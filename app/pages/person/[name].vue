<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const name = computed(() => String(route.params.name))
const list = computed(() => stickersBy(name.value))
const displayName = computed(() => people.find(p => p.name.localeCompare(name.value, 'da', { sensitivity: 'base' }) === 0)?.name ?? name.value)
const countries = computed(() => new Set(list.value.map(s => s.countryCode)).size)
const farthest = computed(() => list.value.reduce<Sticker | undefined>((max, s) => (!max || s.distanceKm > max.distanceKm ? s : max), undefined))

useHead(() => ({ title: `${displayName.value} · Stenbygaard Stickers` }))

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
      <span class="avatar">{{ displayName[0] }}</span>
      <h1>{{ displayName }}</h1>
      <p class="sub">
        {{ list.length }} {{ list.length === 1 ? 'sticker' : 'stickers' }} i {{ countries }} {{ countries === 1 ? 'land' : 'lande' }}
        <template v-if="farthest"> · længst væk i {{ farthest.city }}</template>
      </p>
      <NuxtLink v-if="list.length" class="btn" :to="{ path: '/', query: { by: displayName } }">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4 3 6.5v13.5l6-2.5 6 2.5 6-2.5V4l-6 2.5L9 4Zm0 0v13.5m6-11V20" /></svg>
        Vis {{ genitive(displayName) }} stickers på kortet
      </NuxtLink>
    </header>

    <p v-if="!list.length" class="empty">{{ displayName }} har ikke sat nogen stickers op endnu.</p>
    <div class="cards">
      <StickerCard v-for="s in list" :key="s.id" :sticker="s" />
    </div>
  </div>
</template>

<style scoped>
.page {
  position: relative;
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
header {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  margin-top: 8px;
}
.avatar {
  display: grid;
  place-items: center;
  width: 84px;
  height: 84px;
  border-radius: 50%;
  background: linear-gradient(160deg, #ffe07a, var(--accent));
  font-size: 36px;
  font-weight: 800;
  box-shadow: 0 12px 30px rgba(255, 185, 0, .3);
}
h1 {
  margin-top: 14px;
  font-size: 30px;
}
.sub {
  margin: 4px 0 18px;
  color: var(--muted);
}
.btn { width: 100%; }
.empty { color: var(--muted); text-align: center; }
.cards {
  display: grid;
  gap: 14px;
  margin-top: 22px;
}
</style>
