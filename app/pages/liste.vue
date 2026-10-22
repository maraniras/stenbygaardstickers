<script setup lang="ts">
const sort = ref<'date' | 'far'>('date')

const groups = computed(() => {
  if (sort.value === 'far') {
    return [{ label: '', items: [...stickers].sort((a, b) => b.distanceKm - a.distanceKm) }]
  }
  const out: { label: string, items: Sticker[] }[] = []
  for (const s of stickers) {
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
      <h1>Tidslinje</h1>
      <div class="grid">
        <div class="stat"><b>{{ stats.count }}</b><span>stickers</span></div>
        <div class="stat"><b>{{ stats.countries }}</b><span>{{ stats.countries === 1 ? 'land' : 'lande' }}</span></div>
        <div class="stat"><b>{{ stats.cities }}</b><span>{{ stats.cities === 1 ? 'by' : 'byer' }}</span></div>
      </div>
      <NuxtLink v-if="stats.farthest" class="farthest" :to="`/sticker/${stats.farthest.id}`">
        <span class="label">Længst væk fra Aalborg</span>
        <span class="where"><CountryFlag :code="stats.farthest.countryCode" /> {{ stats.farthest.city }}, {{ stats.farthest.country }}</span>
        <span class="km">{{ formatKm(stats.farthest.distanceKm) }}</span>
      </NuxtLink>
      <div class="sort" role="tablist">
        <button :class="{ on: sort === 'date' }" @click="sort = 'date'">Nyeste</button>
        <button :class="{ on: sort === 'far' }" @click="sort = 'far'">Længst væk</button>
      </div>
    </header>

    <p v-if="!stickers.length" class="empty">Ingen stickers endnu.</p>

    <section v-for="g in groups" :key="g.label" class="group">
      <h2 v-if="g.label">{{ g.label }}</h2>
      <ol class="line">
        <li v-for="s in g.items" :key="s.id">
          <NuxtLink class="card" :to="`/sticker/${s.id}`">
            <div class="thumb">
              <img v-if="thumbnail(s)" :src="thumbnail(s)" alt="" loading="lazy">
              <img v-else src="/marker.png" alt="" class="fallback">
            </div>
            <div class="info">
              <div class="place"><CountryFlag :code="s.countryCode" /> {{ s.city }}, {{ s.country }}</div>
              <h3>{{ s.title }}</h3>
              <div class="meta">{{ formatDate(s.date) }} · {{ formatKm(s.distanceKm) }}</div>
            </div>
          </NuxtLink>
        </li>
      </ol>
    </section>
  </div>
</template>

<style scoped>
.page {
  max-width: 640px;
  margin: 0 auto;
  padding: calc(16px + var(--safe-t)) 16px 32px;
}
h1 { font-size: 34px; }
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-top: 14px;
}
.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px 4px;
  border: 2.5px solid var(--ink);
  border-radius: 14px;
  background: #fff;
}
.stat b { font-size: 28px; line-height: 1; }
.stat span { font-size: 13px; color: var(--muted); font-weight: 600; }
.farthest {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 2px 12px;
  margin-top: 8px;
  padding: 12px 16px;
  border: 2.5px solid var(--ink);
  border-radius: 14px;
  background: var(--ink);
  color: #fff;
  text-decoration: none;
}
.farthest .label { grid-column: 1 / -1; font-size: 12px; color: var(--yellow); font-weight: 600; text-transform: uppercase; letter-spacing: .05em; }
.farthest .where { font-weight: 800; }
.farthest .km { font-weight: 800; color: var(--yellow); }
.sort {
  display: inline-flex;
  margin-top: 18px;
  padding: 3px;
  border: 2.5px solid var(--ink);
  border-radius: 999px;
  background: #fff;
}
.sort button {
  padding: 6px 16px;
  border: 0;
  border-radius: 999px;
  background: none;
  font-weight: 800;
  color: var(--muted);
  cursor: pointer;
}
.sort button.on { background: var(--yellow); color: var(--ink); }
.empty { color: var(--muted); }
.group h2 {
  margin: 22px 0 10px;
  font-size: 15px;
  text-transform: uppercase;
  letter-spacing: .06em;
  color: var(--muted);
}
.group:first-of-type h2 { margin-top: 18px; }
.line {
  position: relative;
  margin: 12px 0 0;
  padding: 0 0 0 26px;
  list-style: none;
}
.line::before {
  content: '';
  position: absolute;
  left: 8px;
  top: 6px;
  bottom: 6px;
  width: 3px;
  border-radius: 2px;
  background: var(--line);
}
li {
  position: relative;
  margin-bottom: 12px;
}
li::before {
  content: '';
  position: absolute;
  left: -25px;
  top: 50%;
  width: 14px;
  height: 14px;
  margin-top: -7px;
  border: 2.5px solid var(--ink);
  border-radius: 50%;
  background: var(--yellow);
}
.card {
  display: flex;
  gap: 12px;
  padding: 8px;
  border: 2.5px solid var(--ink);
  border-radius: 16px;
  background: #fff;
  box-shadow: 3px 3px 0 var(--ink);
  text-decoration: none;
  transition: transform .08s, box-shadow .08s;
}
.card:active { transform: translate(2px, 2px); box-shadow: 1px 1px 0 var(--ink); }
.thumb {
  flex: none;
  width: 76px;
  height: 76px;
  overflow: hidden;
  border-radius: 10px;
  background: var(--paper-2);
}
.thumb img { width: 100%; height: 100%; object-fit: cover; }
.thumb .fallback { object-fit: contain; padding: 10px; }
.info {
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
}
.place, .meta { font-size: 13px; color: var(--muted); font-weight: 600; }
h3 { font-size: 17px; overflow-wrap: anywhere; }
</style>
