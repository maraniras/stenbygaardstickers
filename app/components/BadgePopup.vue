<script setup lang="ts">
// Pop-up når man åbner appen:
//  1. "Level op!" med konfetti, når man er nået et nyt level
//  2. "Ny badge!" for badges man ikke allerede har set, fx ved at trykke på
//     notifikationen (det markerer dem som set på profilsiden)
// Hvilket level man sidst har set, gemmes sammen med de sete badges som "level:<n>".
const { name, seen, markSeen } = useUser()
const { stickers } = useStickers()
const { ratings, ready: ratingsReady } = useRatings()
const { commentStats } = useCommentStats()
const { people: economy, loading: economyLoading } = useEconomy()
const gameAnimation = useState('daily-game-animation', () => false)
const jackAnimation = useState('bananjack-animation', () => false)
const route = useRoute()
const router = useRouter()

const badges = computed(() => {
  if (!name.value || !seen.value || !ratingsReady.value) return undefined
  return badgesFor(name.value, stickers.value, ratings.value, { comments: commentStats.value, economy: economy.value })
})

const unseen = computed(() => {
  if (!badges.value) return []
  const seenSet = new Set(seen.value)
  const keys = earnedKeys(badges.value).filter(k => !seenSet.has(k))
  const ids = new Set(keys.map(badgeIdOf))
  return badges.value.filter(b => ids.has(b.id)).map(b => ({ badge: b, keys: keys.filter(k => badgeIdOf(k) === b.id) }))
})

const level = computed(() => (badges.value ? levelFor(totalPoints(badges.value)) : undefined))
const seenLevel = computed(() => {
  const levels = (seen.value ?? []).filter(k => k.startsWith('level:')).map(k => Number(k.slice(6)))
  return levels.length ? Math.max(...levels) : undefined
})

// Første gang tæller det nuværende level som set – ellers ville alle få "Level op" med det samme
watch([level, seenLevel], ([l, s]) => {
  if (l && s === undefined && seen.value) markSeen([`level:${l.level}`])
})

const levelUp = computed(() => {
  if (!level.value || seenLevel.value === undefined) return undefined
  return level.value.level > seenLevel.value ? level.value : undefined
})

// Ikke midt i en upload/admin, og ikke mens en badge er åben (fx fra en notifikation)
const sheetOpen = useState('badge-sheet-open', () => false)
const blocked = computed(() => route.path.startsWith('/admin') || route.path === '/upload' || route.query.badge !== undefined || sheetOpen.value || gameAnimation.value || jackAnimation.value || economyLoading.value)

const mode = computed<'level' | 'badges' | undefined>(() => (levelUp.value ? 'level' : unseen.value.length ? 'badges' : undefined))

// Lidt ventetid, så en åbnet notifikation kan nå at markere sin badge som set først
const show = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined
watch(() => Boolean(mode.value) && !blocked.value, (want) => {
  clearTimeout(timer)
  if (!want) show.value = false
  else timer = setTimeout(() => { show.value = Boolean(mode.value) && !blocked.value }, 1500)
}, { immediate: true })

// Konfetti, når level-op vises
watch(() => show.value && mode.value === 'level', (on) => {
  if (on) setTimeout(shootConfetti, 150)
})

const allKeys = computed(() => unseen.value.flatMap(u => u.keys))

function close() {
  if (mode.value === 'level') {
    if (levelUp.value) markSeen([`level:${levelUp.value.level}`])
    // Er der også nye badges, kommer de bagefter
    return
  }
  markSeen(allKeys.value)
  show.value = false
}

function open() {
  if (mode.value === 'level') {
    close()
    show.value = false
    if (name.value) router.push(personUrl(name.value))
    return
  }
  const one = unseen.value.length === 1 ? unseen.value[0]!.badge.id : undefined
  close()
  if (name.value) router.push({ path: personUrl(name.value), query: one ? { badge: one } : {} })
}
</script>

<template>
  <Transition name="fade">
    <div v-if="show && mode" class="backdrop" @click.self="close">
      <div v-if="mode === 'level' && levelUp" :key="`level-${levelUp.level}`" class="card level" role="dialog" aria-modal="true" aria-labelledby="popup-title">
        <div class="shine">
          <LevelBadge :level="levelUp.level" :size="120" />
        </div>
        <p class="eyebrow">Level op!</p>
        <h2 id="popup-title">Level {{ levelUp.level }}</h2>
        <p class="title">{{ levelUp.title }}</p>
        <p class="desc">
          {{ levelUp.points }} point
          <template v-if="levelUp.next"> · {{ levelUp.next.at - levelUp.points }} til {{ levelUp.next.title }}</template>
          <template v-else> · Du har nået toppen 👑</template>
        </p>
        <button class="btn" @click="open">Se min profil</button>
        <button class="btn secondary" @click="close">Fedt!</button>
      </div>

      <div v-else key="badges" class="card" role="dialog" aria-modal="true" aria-labelledby="popup-title">
        <p class="burst">🎉</p>
        <h2 id="popup-title">{{ unseen.length === 1 ? 'Ny badge!' : `${unseen.length} nye badges!` }}</h2>
        <div class="medals">
          <BadgeMedal v-for="u in unseen.slice(0, 3)" :key="u.badge.id" :badge="u.badge" />
        </div>
        <p v-if="unseen.length > 3" class="more">+ {{ unseen.length - 3 }} til</p>
        <p v-else-if="unseen.length === 1" class="desc">{{ unseen[0]!.badge.desc }}</p>
        <button class="btn" @click="open">{{ unseen.length === 1 ? 'Se badge' : 'Se dem' }}</button>
        <button class="btn secondary" @click="close">Luk</button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.backdrop {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(10, 10, 14, .45);
  -webkit-backdrop-filter: blur(4px);
  backdrop-filter: blur(4px);
}
.card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  width: 100%;
  max-width: 340px;
  padding: 24px 20px 20px;
  border-radius: 28px;
  background: var(--surface);
  box-shadow: var(--shadow);
  text-align: center;
  animation: pop .45s cubic-bezier(.3, 1.6, .5, 1);
}
.burst {
  margin: -4px 0 0;
  font-size: 40px;
  line-height: 1;
}
h2 { font-size: 24px; }
.level h2 { font-size: 30px; margin-top: -6px; }
.level .eyebrow { margin: 4px 0 0; color: var(--accent); }
.title {
  margin: -6px 0 0;
  font-size: 18px;
  font-weight: 800;
}
.shine {
  position: relative;
  display: grid;
  place-items: center;
  width: 150px;
  height: 150px;
  margin-top: -6px;
  animation: grow .7s cubic-bezier(.3, 1.6, .5, 1) both;
}
.shine::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: conic-gradient(from 0deg, transparent, var(--accent-soft), transparent 30%, var(--accent-soft), transparent 60%, var(--accent-soft), transparent);
  animation: spin 6s linear infinite;
}
.shine > * { position: relative; filter: drop-shadow(0 8px 16px rgba(0, 0, 0, .25)); }
.medals {
  display: flex;
  justify-content: center;
  gap: 8px;
  width: 100%;
  margin: 6px 0;
}
.medals > * { flex: 0 1 96px; }
.desc, .more {
  margin: 0 0 6px;
  font-size: 14px;
  color: var(--muted);
}
.btn { width: 100%; }
@keyframes pop {
  from { transform: scale(.8); opacity: 0; }
}
@keyframes grow {
  from { transform: scale(.3) rotate(-25deg); opacity: 0; }
}
@keyframes spin { to { transform: rotate(360deg); } }
.fade-enter-active, .fade-leave-active { transition: opacity .2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
