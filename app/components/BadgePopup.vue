<script setup lang="ts">
// "Ny badge!" når man åbner appen – kun for badges man ikke allerede har set, fx ved
// at trykke på notifikationen (det markerer dem som set på profilsiden).
const { name, seen, markSeen } = useUser()
const { stickers } = useStickers()
const { ratings, ready: ratingsReady } = useRatings()
const route = useRoute()
const router = useRouter()

const unseen = computed(() => {
  if (!name.value || !seen.value || !ratingsReady.value) return []
  const badges = badgesFor(name.value, stickers.value, ratings.value)
  const seenSet = new Set(seen.value)
  const keys = earnedKeys(badges).filter(k => !seenSet.has(k))
  const ids = new Set(keys.map(badgeIdOf))
  return badges.filter(b => ids.has(b.id)).map(b => ({ badge: b, keys: keys.filter(k => badgeIdOf(k) === b.id) }))
})

// Ikke midt i en upload/admin, og ikke mens en badge er åben (fx fra en notifikation)
const sheetOpen = useState('badge-sheet-open', () => false)
const blocked = computed(() => route.path.startsWith('/admin') || route.path === '/upload' || route.query.badge !== undefined || sheetOpen.value)

// Lidt ventetid, så en åbnet notifikation kan nå at markere sin badge som set først
const show = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined
watch(() => unseen.value.length > 0 && !blocked.value, (want) => {
  clearTimeout(timer)
  if (!want) show.value = false
  else timer = setTimeout(() => { show.value = unseen.value.length > 0 && !blocked.value }, 1500)
}, { immediate: true })

const allKeys = computed(() => unseen.value.flatMap(u => u.keys))

function close() {
  markSeen(allKeys.value)
  show.value = false
}

function open() {
  const one = unseen.value.length === 1 ? unseen.value[0]!.badge.id : undefined
  close()
  if (name.value) router.push({ path: personUrl(name.value), query: one ? { badge: one } : {} })
}
</script>

<template>
  <Transition name="fade">
    <div v-if="show && unseen.length" class="backdrop" @click.self="close">
      <div class="card" role="dialog" aria-modal="true" aria-labelledby="badge-popup-title">
        <p class="burst">🎉</p>
        <h2 id="badge-popup-title">{{ unseen.length === 1 ? 'Ny badge!' : `${unseen.length} nye badges!` }}</h2>
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
.fade-enter-active, .fade-leave-active { transition: opacity .2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
