<script setup lang="ts">
const { release, pending, open, dismiss } = useReleaseNews()
const route = useRoute()
const router = useRouter()
const { open: installOpen } = useInstall()
const namePrompt = useState('name-prompt', () => 'pending')
const pushPrompt = useState('push-prompt', () => null)
const badgeSheet = useState('badge-sheet-open', () => false)
const dailyAnimation = useState('daily-game-animation', () => false)
const jackAnimation = useState('bananjack-animation', () => false)
const slotAnimation = useState('slot-animation', () => false)
const settled = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined
onMounted(() => {
  timer = setTimeout(() => {
    settled.value = true
  }, 3200)
})
onBeforeUnmount(() => clearTimeout(timer))
watchEffect(() => {
  const blocked =
    !settled.value ||
    installOpen.value ||
    namePrompt.value !== 'done' ||
    pushPrompt.value ||
    badgeSheet.value ||
    route.query.badge !== undefined ||
    dailyAnimation.value ||
    jackAnimation.value ||
    slotAnimation.value ||
    route.path === '/upload' ||
    route.path.startsWith('/admin')
  open.value = Boolean(pending.value && !blocked)
})
function allUpdates() {
  dismiss()
  router.push('/nyheder')
}
</script>
<template>
  <AppDialog
    v-if="open && release"
    label="Hvad er nyt?"
    @close="dismiss"
  >
    <div class="release-news">
      <button
        class="close"
        aria-label="Luk Hvad er nyt"
        @click="dismiss"
      >
        ×
      </button>
      <span class="eyebrow">Ny opdatering · Version {{ release.version }}</span>
      <h2>Hvad er nyt?</h2>
      <p>Her er det nye i denne opdatering.</p>
      <ul>
        <li
          v-for="note in release.notes"
          :key="note"
        >
          {{ note }}
        </li>
      </ul>
      <button
        class="btn"
        @click="dismiss"
      >
        Lad mig se det
      </button>
      <button
        class="all-updates"
        @click="allUpdates"
      >
        Se alle opdateringer →
      </button>
    </div>
  </AppDialog>
</template>
<style scoped>
.release-news {
  position: relative;
  padding: 30px 24px calc(20px + var(--safe-b));
}
.eyebrow {
  display: block;
  margin-right: 30px;
  color: var(--muted);
  font-size: 11px;
  font-weight: 700;
}
h2 {
  margin-top: 10px;
  font-size: 30px;
}
p {
  font-size: 13px;
  color: var(--muted);
}
ul {
  margin: 22px 0;
  padding-left: 20px;
  display: grid;
  gap: 12px;
  font-size: 14px;
}
li::marker {
  color: var(--accent);
}
.close {
  position: absolute;
  top: 14px;
  right: 10px;
  width: 44px;
  height: 44px;
  border: 0;
  background: none;
  color: var(--muted);
  font-size: 28px;
}
.btn {
  width: 100%;
}
.all-updates {
  display: block;
  width: 100%;
  min-height: 44px;
  margin-top: 8px;
  border: 0;
  background: none;
  color: var(--muted);
  font: inherit;
  font-size: 13px;
}
</style>
