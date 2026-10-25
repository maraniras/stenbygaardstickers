<script setup lang="ts">
// Profil: tal, badges (app/utils/badges.ts), lande og personens stickers
const route = useRoute()
const { stickers, people, stickersBy } = useStickers()
const { ratings } = useRatings()
const router = useRouter()
const name = computed(() => String(route.params.name))
const list = computed(() => stickersBy(name.value))
const displayName = computed(() => people.value.find(p => sameName(p.name, name.value))?.name ?? name.value)
const stats = computed(() => statsFor(list.value))
const countryList = computed(() => {
  const map = new Map<string, { code: string, name: string, count: number }>()
  for (const s of list.value) {
    const c = map.get(s.countryCode) ?? { code: s.countryCode, name: s.country, count: 0 }
    c.count++
    map.set(s.countryCode, c)
  }
  return [...map.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'da'))
})
const badges = computed(() => badgesFor(name.value, stickers.value, ratings.value)
  .sort((a, b) => Number(b.earned) - Number(a.earned)))

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
      <p class="sub">{{ earnedCount(badges) }} af {{ badges.length }} badges</p>
    </header>

    <div class="grid">
      <div class="stat"><b>{{ stats.count }}</b><span>{{ stats.count === 1 ? 'sticker' : 'stickers' }}</span></div>
      <div class="stat"><b>{{ stats.countries }}</b><span>{{ stats.countries === 1 ? 'land' : 'lande' }}</span></div>
      <div class="stat"><b>{{ stats.cities }}</b><span>{{ stats.cities === 1 ? 'by' : 'byer' }}</span></div>
    </div>
    <NuxtLink v-if="stats.farthest" class="farthest" :to="`/sticker/${stats.farthest.id}`">
      <div>
        <span class="eyebrow">Længst væk</span>
        <span class="where"><CountryFlag :code="stats.farthest.countryCode" /> {{ stats.farthest.city }}, {{ stats.farthest.country }}</span>
      </div>
      <span class="km">{{ formatKm(stats.farthest.distanceKm) }}</span>
    </NuxtLink>

    <section class="section">
      <h2 class="eyebrow">Badges</h2>
      <div class="badges">
        <BadgeMedal v-for="b in badges" :key="b.id" :badge="b" />
      </div>
    </section>

    <section v-if="countryList.length" class="section">
      <h2 class="eyebrow">Lande</h2>
      <div class="countries">
        <span v-for="c in countryList" :key="c.code" class="chip country">
          <CountryFlag :code="c.code" /> {{ c.name }} <span class="n">{{ c.count }}</span>
        </span>
      </div>
    </section>

    <section class="section">
      <h2 class="eyebrow">Stickers</h2>
      <NuxtLink v-if="list.length" class="btn map-btn" :to="{ path: '/', query: { by: displayName } }">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4 3 6.5v13.5l6-2.5 6 2.5 6-2.5V4l-6 2.5L9 4Zm0 0v13.5m6-11V20" /></svg>
        Vis {{ genitive(displayName) }} stickers på kortet
      </NuxtLink>
      <p v-if="!list.length" class="empty">{{ displayName }} har ikke sat nogen stickers op endnu.</p>
      <div class="cards">
        <StickerCard v-for="s in list" :key="s.id" :sticker="s" />
      </div>
    </section>
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
  margin-top: -20px;
}
.avatar {
  display: grid;
  place-items: center;
  width: 84px;
  height: 84px;
  border-radius: 50%;
  background: linear-gradient(160deg, var(--accent-light), var(--accent));
  color: var(--on-accent);
  font-size: 36px;
  font-weight: 800;
  box-shadow: 0 12px 30px rgba(0, 0, 0, .15);
}
h1 {
  margin-top: 14px;
  font-size: 30px;
}
.sub {
  margin: 4px 0 0;
  color: var(--muted);
  font-weight: 600;
}
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-top: 20px;
}
.stat {
  display: flex;
  flex-direction: column;
  padding: 14px 16px;
  border-radius: 18px;
  background: var(--surface);
  box-shadow: var(--shadow-sm);
}
.stat b { font-size: 28px; line-height: 1.1; letter-spacing: -0.02em; }
.stat span { font-size: 13px; color: var(--muted); font-weight: 600; }
.farthest {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 8px;
  padding: 16px 18px;
  border-radius: 18px;
  background: var(--ink);
  color: #fff;
  text-decoration: none;
}
.farthest .eyebrow { display: block; color: rgba(255, 255, 255, .6); }
.farthest .where { font-weight: 700; }
.farthest .km {
  padding: 6px 12px;
  border-radius: 999px;
  background: var(--accent);
  color: var(--on-accent);
  font-weight: 800;
  white-space: nowrap;
}
.section { margin-top: 28px; }
.section h2 { margin: 0 0 12px 4px; }
.badges {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
  gap: 18px 8px;
  padding: 18px 10px;
  border-radius: var(--radius);
  background: var(--surface);
  box-shadow: var(--shadow-sm);
}
.countries {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.country {
  padding: 6px 8px 6px 12px;
  background: var(--surface);
  box-shadow: var(--shadow-sm);
  font-size: 14px;
}
.n {
  min-width: 22px;
  padding: 1px 7px;
  border-radius: 999px;
  background: var(--surface-2);
  text-align: center;
  font-size: 12px;
  font-weight: 700;
}
.map-btn { width: 100%; }
.empty { color: var(--muted); text-align: center; }
.cards {
  display: grid;
  gap: 14px;
  margin-top: 14px;
}
</style>
