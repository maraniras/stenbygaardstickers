<script setup lang="ts">
useHead({ title: 'Stickers · Stenbygaard Stickers' })
const sort = ref<'date' | 'far' | 'stars'>('date')
const { stickers, people, stats } = useStickers()
const { ratings, enabled } = useRatings()
const { commentStats } = useCommentStats()
const { people: economy } = useEconomy()
const levels = computed(() =>
  Object.fromEntries(
    people.value.map((p) => [
      p.name,
      levelFor(
        totalPoints(
          badgesFor(p.name, stickers.value, ratings.value, {
            comments: commentStats.value,
            economy: economy.value,
          }),
        ),
      ),
    ]),
  ),
)
const { show: showInstall } = useInstall()
const standalone = ref(true)
onMounted(() => {
  standalone.value = isStandalone()
})

const groups = computed(() => {
  if (sort.value === 'far') {
    return [{ label: '', items: [...stickers.value].sort((a, b) => b.distanceKm - a.distanceKm) }]
  }
  if (sort.value === 'stars') {
    const avg = (s: Sticker) => ratings.value[s.id]?.avg ?? 0
    return [{ label: '', items: [...stickers.value].sort((a, b) => avg(b) - avg(a)) }]
  }
  const out: { label: string; items: Sticker[] }[] = []
  for (const s of stickers.value) {
    const label = new Date(`${s.date}T12:00:00`).toLocaleDateString('da-DK', {
      month: 'long',
      year: 'numeric',
    })
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
          <NuxtLink
            class="add-sticker"
            to="/upload"
            >＋ Tilføj</NuxtLink
          >
          <NotifyButton />
        </div>
      </div>
      <div class="grid">
        <div class="stat">
          <b>{{ stats.count }}</b
          ><span>{{ stats.count === 1 ? 'sticker' : 'stickers' }}</span>
        </div>
        <NuxtLink
          class="stat link"
          to="/lande"
          ><b>{{ stats.countries }}</b
          ><span>{{ stats.countries === 1 ? 'land' : 'lande' }} <i>›</i></span></NuxtLink
        >
        <div class="stat">
          <b>{{ stats.cities }}</b
          ><span>{{ stats.cities === 1 ? 'by' : 'byer' }}</span>
        </div>
      </div>
      <NuxtLink
        v-if="stats.farthest"
        class="farthest"
        :to="`/sticker/${stats.farthest.id}`"
      >
        <div>
          <span class="eyebrow">Længst væk fra Aalborg</span>
          <span class="where"
            ><CountryFlag :code="stats.farthest.countryCode" /> {{ stats.farthest.city }},
            {{ stats.farthest.country }}</span
          >
        </div>
        <span class="km">{{ formatKm(stats.farthest.distanceKm) }}</span>
      </NuxtLink>

      <details
        v-if="people.length"
        class="people"
      >
        <summary>
          Sat op af {{ people.length }} {{ people.length === 1 ? 'person' : 'personer' }}
        </summary>
        <div class="people-heading">
          <span class="eyebrow">Sat op af</span
          ><NuxtLink to="/rangliste">Alle profiler og rangliste ›</NuxtLink>
        </div>
        <div class="row">
          <NuxtLink
            v-for="p in people.slice(0, 5)"
            :key="p.name"
            class="chip person"
            :to="personUrl(p.name)"
          >
            <UserAvatar
              class="avatar"
              :name="p.name"
            />
            {{ p.name }}
            <span class="n">{{ p.count }}</span>
            <LevelBadge
              :level="levels[p.name]!.level"
              :size="24"
              :title="`Level ${levels[p.name]!.level} · ${levels[p.name]!.title}`"
            />
          </NuxtLink>
        </div>
      </details>

      <div
        class="sort"
        role="group"
        aria-label="Sortér stickers"
      >
        <button
          :class="{ on: sort === 'date' }"
          :aria-pressed="sort === 'date'"
          @click="sort = 'date'"
        >
          Nyeste
        </button>
        <button
          :class="{ on: sort === 'far' }"
          :aria-pressed="sort === 'far'"
          @click="sort = 'far'"
        >
          Længst væk
        </button>
        <button
          v-if="enabled"
          :class="{ on: sort === 'stars' }"
          :aria-pressed="sort === 'stars'"
          @click="sort = 'stars'"
        >
          Bedst bedømt
        </button>
      </div>
    </header>

    <p
      v-if="!stickers.length"
      class="empty"
    >
      Ingen stickers endnu.
    </p>

    <section
      v-for="g in groups"
      :key="g.label"
      class="group"
    >
      <h2
        v-if="g.label"
        class="eyebrow"
      >
        {{ g.label }}
      </h2>
      <div class="cards">
        <StickerCard
          v-for="s in g.items"
          :key="s.id"
          :sticker="s"
        />
      </div>
    </section>

    <div class="footer-links">
      <NuxtLink
        class="add-link"
        to="/nyheder"
        >Hvad er nyt</NuxtLink
      >
      <button
        v-if="!standalone"
        class="add-link"
        @click="showInstall"
      >
        Installer appen
      </button>
      <NuxtLink
        class="add-link"
        to="/admin"
        >Admin</NuxtLink
      >
    </div>
  </div>
</template>

<style scoped>
.add-sticker {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  padding: 0 12px;
  border-radius: 14px;
  background: var(--surface);
  color: var(--text);
  text-decoration: none;
  font-size: 13px;
  font-weight: 700;
}
.people summary {
  min-height: 44px;
  align-content: center;
  cursor: pointer;
  color: var(--muted);
  font-size: 12px;
}

.people-heading {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}
.people-heading a {
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  color: var(--muted);
  font-size: 11px;
  font-weight: 700;
  text-decoration: none;
}
.page {
  max-width: 640px;
  margin: 0 auto;
  padding: calc(20px + var(--safe-t)) 16px calc(var(--nav-space) + 80px);
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
h1 {
  font-size: 34px;
}
.grid {
  margin-top: 10px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.stat {
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  border-radius: 18px;
  background: var(--surface);
  box-shadow: var(--shadow-sm);
}
.stat b {
  font-size: 23px;
  line-height: 1.1;
  letter-spacing: -0.02em;
}
.stat span {
  font-size: 13px;
  color: var(--muted);
  font-weight: 600;
}
.stat.link {
  text-decoration: none;
}
.stat.link i {
  font-style: normal;
  font-weight: 800;
  color: var(--accent);
}
.farthest {
  padding: 9px 12px;
  margin-top: 8px;
  background: var(--surface);
  color: var(--text);
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-radius: 18px;
  text-decoration: none;
}
.farthest .eyebrow {
  font-size: 9px;
  color: var(--muted);
  display: block;
}
.farthest .where {
  font-weight: 700;
}
.farthest .km {
  padding: 4px 8px;
  font-size: 12px;
  border-radius: 999px;
  background: var(--accent);
  color: var(--on-accent);
  font-weight: 800;
  white-space: nowrap;
}
.people {
  margin-top: 8px;
}
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
  margin-top: 10px;
  display: flex;
  gap: 4px;
  padding: 4px;
  border-radius: 14px;
  background: var(--surface-2);
}
.sort button {
  flex: 1;
  padding: 10px 4px;
  border: 0;
  border-radius: 10px;
  background: none;
  font-size: 12px;
  font-weight: 700;
  color: var(--muted);
  cursor: pointer;
  min-height: 44px;
  white-space: nowrap;
}
.sort button.on {
  background: var(--surface);
  color: var(--text);
  box-shadow: var(--shadow-sm);
}
.empty {
  color: var(--muted);
}
.group h2 {
  margin: 26px 0 10px 4px;
}
.group:first-of-type h2 {
  margin-top: 22px;
}
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
