<script setup lang="ts">
const sort = ref<'date' | 'far' | 'stars'>('date')
const { stickers, people, stats } = useStickers()
const { ratings, enabled } = useRatings()
const badgeCount = computed(() => Object.fromEntries(people.value.map(p => [p.name, earnedCount(badgesFor(p.name, stickers.value, ratings.value))])))
const { show: showInstall } = useInstall()
const standalone = ref(true)
onMounted(() => { standalone.value = isStandalone() })

const groups = computed(() => {
  if (sort.value === 'far') {
    return [{ label: '', items: [...stickers.value].sort((a, b) => b.distanceKm - a.distanceKm) }]
  }
  if (sort.value === 'stars') {
    const avg = (s: Sticker) => ratings.value[s.id]?.avg ?? 0
    return [{ label: '', items: [...stickers.value].sort((a, b) => avg(b) - avg(a)) }]
  }
  const out: { label: string, items: Sticker[] }[] = []
  for (const s of stickers.value) {
    const label = new Date(`${s.date}T12:00:00`).toLocaleDateString('da-DK', { month: 'long', year: 'numeric' })
    if (out.at(-1)?.label !== label) out.push({ label, items: [] })
    out.at(-1)!.items.push(s)
  }
  return out
})
</script>

<template>
  <div class="page">
    <header>
      <div class="title">
        <h1>Stickers</h1>
        <div class="title-actions">
          <NotifyButton />
          <UploadButton />
          <RefreshButton />
        </div>
      </div>
      <div class="grid">
        <div class="stat"><b>{{ stats.count }}</b><span>{{ stats.count === 1 ? 'sticker' : 'stickers' }}</span></div>
        <NuxtLink class="stat link" to="/lande"><b>{{ stats.countries }}</b><span>{{ stats.countries === 1 ? 'land' : 'lande' }} <i>›</i></span></NuxtLink>
        <div class="stat"><b>{{ stats.cities }}</b><span>{{ stats.cities === 1 ? 'by' : 'byer' }}</span></div>
      </div>
      <NuxtLink v-if="stats.farthest" class="farthest" :to="`/sticker/${stats.farthest.id}`">
        <div>
          <span class="eyebrow">Længst væk fra Aalborg</span>
          <span class="where"><CountryFlag :code="stats.farthest.countryCode" /> {{ stats.farthest.city }}, {{ stats.farthest.country }}</span>
        </div>
        <span class="km">{{ formatKm(stats.farthest.distanceKm) }}</span>
      </NuxtLink>

      <section v-if="people.length" class="people">
        <span class="eyebrow">Sat op af</span>
        <div class="row">
          <NuxtLink v-for="p in people" :key="p.name" class="chip person" :to="personUrl(p.name)">
            <span class="avatar">{{ p.name[0] }}</span>
            {{ p.name }}
            <span class="n">{{ p.count }}</span>
            <span v-if="badgeCount[p.name]" class="medals" :title="`${badgeCount[p.name]} badges`">🏅 {{ badgeCount[p.name] }}</span>
          </NuxtLink>
        </div>
      </section>

      <div class="sort" role="tablist">
        <button :class="{ on: sort === 'date' }" @click="sort = 'date'">Nyeste</button>
        <button :class="{ on: sort === 'far' }" @click="sort = 'far'">Længst væk</button>
        <button v-if="enabled" :class="{ on: sort === 'stars' }" @click="sort = 'stars'">Flest stjerner</button>
      </div>
    </header>

    <p v-if="!stickers.length" class="empty">Ingen stickers endnu.</p>

    <section v-for="g in groups" :key="g.label" class="group">
      <h2 v-if="g.label" class="eyebrow">{{ g.label }}</h2>
      <div class="cards">
        <StickerCard v-for="s in g.items" :key="s.id" :sticker="s" />
      </div>
    </section>

    <div class="footer-links">
      <button v-if="!standalone" class="add-link" @click="showInstall">Installer appen</button>
      <NuxtLink class="add-link" to="/admin">Admin</NuxtLink>
    </div>
  </div>
</template>

<style scoped>
.page {
  max-width: 640px;
  margin: 0 auto;
  padding: calc(20px + var(--safe-t)) 16px var(--nav-space);
}
.title {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.title-actions {
  display: flex;
  gap: 8px;
}
h1 { font-size: 34px; }
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-top: 16px;
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
.stat.link { text-decoration: none; }
.stat.link i { font-style: normal; font-weight: 800; color: var(--accent); }
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
.people { margin-top: 22px; }
.row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}
.person {
  padding: 4px 6px 4px 4px;
  background: var(--surface);
  box-shadow: var(--shadow-sm);
  font-size: 14px;
}
.avatar {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--accent-soft);
  font-weight: 800;
}
.medals {
  padding: 1px 7px 1px 5px;
  border-radius: 999px;
  background: var(--accent-soft);
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}
.n {
  min-width: 24px;
  padding: 1px 7px;
  border-radius: 999px;
  background: var(--surface-2);
  text-align: center;
  font-size: 12px;
  font-weight: 700;
}
.sort {
  display: flex;
  gap: 4px;
  margin-top: 22px;
  padding: 4px;
  border-radius: 14px;
  background: var(--surface-2);
}
.sort button {
  flex: 1;
  padding: 8px 6px;
  border: 0;
  border-radius: 10px;
  background: none;
  font-size: 14px;
  font-weight: 700;
  color: var(--muted);
  cursor: pointer;
}
.sort button.on {
  background: var(--surface);
  color: var(--text);
  box-shadow: var(--shadow-sm);
}
.empty { color: var(--muted); }
.group h2 { margin: 26px 0 10px 4px; }
.group:first-of-type h2 { margin-top: 22px; }
.cards {
  display: grid;
  gap: 14px;
  margin-top: 14px;
}
.footer-links {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin: 32px 0 8px;
}
.add-link {
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  color: var(--muted);
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
}
</style>
