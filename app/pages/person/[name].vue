<script setup lang="ts">
// Profil: tal, badges (shared/utils/badges.ts), lande og personens stickers
const route = useRoute()
const { stickers, people, stickersBy } = useStickers()
const { ratings } = useRatings()
const { commentStats } = useCommentStats()
const { people: economy } = useEconomy()
const { name: me, isMe, markSeen } = useUser()
const router = useRouter()
const name = computed(() => String(route.params.name))
const list = computed(() => stickersBy(name.value))
const displayName = computed(() => people.value.find(p => sameName(p.name, name.value))?.name ?? name.value)
const stats = computed(() => statsFor(list.value))
const jackStats = computed(() => economy.value[name.value.toLocaleLowerCase('da')]?.jack)
const countryList = computed(() => {
  const map = new Map<string, { code: string, name: string, count: number }>()
  for (const s of list.value) {
    const c = map.get(s.countryCode) ?? { code: s.countryCode, name: s.country, count: 0 }
    c.count++
    map.set(s.countryCode, c)
  }
  return [...map.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'da'))
})
const badges = computed(() => badgesFor(name.value, stickers.value, ratings.value, { history: true, comments: commentStats.value, economy: economy.value }))
const openBadge = ref<string>()
const openedBadge = computed(() => badges.value.find(b => b.id === openBadge.value))
const badgeTab = ref<'earned' | 'missing'>('earned')
const shownBadges = computed(() => badges.value.filter(b => b.earned === (badgeTab.value === 'earned')))

useHead(() => ({ title: `${displayName.value} · Stenbygaard Stickers` }))

// Åbnet fra en notifikation (/person/<navn>?badge=<id>): vis badgen med det samme
watch(() => route.query.badge, (id) => {
  if (typeof id !== 'string' || !badges.value.some(b => b.id === id)) return
  openBadge.value = id
  if (id) badgeTab.value = badges.value.find(b => b.id === id)?.earned ? 'earned' : 'missing'
  const { badge: _, ...rest } = route.query
  router.replace({ query: rest })
}, { immediate: true })

// "Ny badge"-pop-up'en venter, mens en badge er åben
const sheetOpen = useState('badge-sheet-open', () => false)
watch(openedBadge, (b) => { sheetOpen.value = Boolean(b) }, { immediate: true })
onBeforeUnmount(() => { sheetOpen.value = false })

// Ens egne badges tæller som set, når man har åbnet dem. Åbnes appen fra en
// notifikation, er brugeren måske ikke hentet endnu – så venter vi på navnet.
watch([openedBadge, me], ([b]) => {
  if (b?.earned && isMe(displayName.value)) markSeen(earnedKeys([b]))
}, { immediate: true })

function back() {
  if (window.history.state?.back) router.back()
  else router.push('/liste')
}
</script>

<template>
  <div class="page">
    <div class="topbar">
      <button class="back" aria-label="Tilbage" @click="back">
        <svg viewBox="0 0 24 24"><path d="M15 5 8 12l7 7" /></svg>
      </button>
      <NuxtLink v-if="isMe(displayName)" class="back" to="/mig" aria-label="Indstillinger" title="Indstillinger">
        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" /></svg>
      </NuxtLink>
    </div>

    <header>
      <UserAvatar class="avatar" :name="displayName" />
      <h1>{{ displayName }}</h1>
      <p class="sub">{{ earnedCount(badges) }} af {{ badges.length }} badges</p>
      <span v-if="isMe(displayName)" class="chip you">Det er dig</span>    </header>

    <LevelCard :points="totalPoints(badges)" />
    <BananaWallet :person="displayName" :own="isMe(displayName)" />
    <JackProfileStats v-if="jackStats?.rounds" :stats="jackStats" />
    <NuxtLink class="ranking-link" to="/rangliste">Se alle profiler og ranglisten <span aria-hidden="true">↗</span></NuxtLink>

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
      <div class="tabs" role="tablist">
        <button :class="{ on: badgeTab === 'earned' }" @click="badgeTab = 'earned'">Opnået <span>{{ earnedCount(badges) }}</span></button>
        <button :class="{ on: badgeTab === 'missing' }" @click="badgeTab = 'missing'">Mangler <span>{{ badges.length - earnedCount(badges) }}</span></button>
      </div>
      <div v-if="shownBadges.length" class="badges">
        <button v-for="b in shownBadges" :key="b.id" class="badge-btn" :aria-label="`${b.name} – se detaljer`" @click="openBadge = b.id">
          <BadgeMedal :badge="b" />
        </button>
      </div>
      <p v-else class="empty">{{ badgeTab === 'earned' ? 'Ingen badges endnu – sæt en sticker op!' : 'Alle badges er taget 🎉' }}</p>
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

    <Transition name="fade">
      <BadgeSheet v-if="openedBadge" :badge="openedBadge" :person="displayName" @close="openBadge = undefined" />
    </Transition>
  </div>
</template>

<style scoped>
.ranking-link { display: flex; justify-content: space-between; align-items: center; gap: 12px; min-height: 44px; margin: 10px 3px 0; color: var(--muted); font-size: 12px; font-weight: 700; text-decoration: none; }
.page {
  position: relative;
  max-width: 640px;
  margin: 0 auto;
  padding: calc(20px + var(--safe-t)) 16px var(--nav-space);
}
.topbar {
  display: flex;
  justify-content: space-between;
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
.you {
  margin-top: 10px;
  background: var(--accent-soft);
}.grid {
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
.tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 10px;
  padding: 4px;
  border-radius: 14px;
  background: var(--surface-2);
}
.tabs button {
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
.tabs button span { margin-left: 4px; opacity: .7; }
.tabs button.on {
  background: var(--surface);
  color: var(--text);
  box-shadow: var(--shadow-sm);
}
.badges {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
  gap: 18px 8px;
  padding: 18px 10px;
  border-radius: var(--radius);
  background: var(--surface);
  box-shadow: var(--shadow-sm);
}
.badge-btn {
  display: block;
  min-width: 0;
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  color: inherit;
  cursor: pointer;
}
.badge-btn:active { transform: scale(.96); }
.fade-enter-active, .fade-leave-active { transition: opacity .2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
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
