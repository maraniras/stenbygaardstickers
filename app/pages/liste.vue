<script setup lang="ts">
definePageMeta({ keepalive: true })
useHead({ title: 'Udforsk · Stenbygaard Stickers' })
const route = useRoute()
const router = useRouter()
const sort = useState<'date' | 'far' | 'stars'>('explore-sort', () => 'date')
const { stickers, stickersBy, people } = useStickers()
const person = computed(() => (typeof route.query.by === 'string' ? route.query.by : ''))
const country = computed(() => (typeof route.query.country === 'string' ? route.query.country : ''))
const visible = computed(() =>
  (person.value ? stickersBy(person.value) : stickers.value).filter(
    (s) => !country.value || s.countryCode === country.value,
  ),
)
const stats = computed(() => statsFor(visible.value))
const allPeople = ref(false)
function filterPerson(name = '') {
  const { by: _, ...query } = route.query
  router.replace({ path: '/liste', query: name ? { ...query, by: name } : query })
}
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

const groups = computed(() => {
  if (sort.value === 'far') {
    return [{ label: '', items: [...visible.value].sort((a, b) => b.distanceKm - a.distanceKm) }]
  }
  if (sort.value === 'stars') {
    const avg = (s: Sticker) => ratings.value[s.id]?.avg ?? 0
    return [{ label: '', items: [...visible.value].sort((a, b) => avg(b) - avg(a)) }]
  }
  const out: { label: string; items: Sticker[] }[] = []
  for (const s of visible.value) {
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
    <section aria-label="Stickeroversigt">
      <PageHeader title="Udforsk">
        <template #actions>
          <NotifyButton />
        </template>
      </PageHeader>
      <ExploreToolbar view="list" />
      <button
        v-if="person"
        class="chip selected-person"
        @click="filterPerson()"
      >
        Sat op af {{ person }} <span aria-hidden="true">×</span
        ><span class="sr-only">Fjern filter</span>
      </button>
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
        <div class="row">
          <button
            v-for="p in allPeople ? people : people.slice(0, 5)"
            :key="p.name"
            class="chip person"
            :aria-pressed="person === p.name"
            @click="filterPerson(person === p.name ? '' : p.name)"
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
          </button>
          <button
            v-if="people.length > 5"
            class="chip more-people"
            :aria-expanded="allPeople"
            @click="allPeople = !allPeople"
          >
            {{ allPeople ? 'Vis færre' : `Vis alle ${people.length}` }}
          </button>
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
    </section>

    <p
      v-if="!visible.length"
      class="empty"
    >
      {{ person || country ? 'Ingen stickers matcher filtrene.' : 'Ingen stickers endnu.' }}
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
  </div>
</template>

<style scoped>
.selected-person {
  margin-top: 12px;
  background: var(--ink);
  color: #fff;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
.person[aria-pressed='true'] {
  outline: 2px solid var(--accent);
}
.more-people {
  min-height: 44px;
  background: var(--surface-2);
}
.people summary {
  min-height: 44px;
  align-content: center;
  cursor: pointer;
  color: var(--muted);
  font-size: 12px;
}

.page {
  max-width: 640px;
  margin: 0 auto;
  padding: calc(20px + var(--safe-t)) 16px 80px;
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
</style>
