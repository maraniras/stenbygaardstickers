<script setup lang="ts">
const props = defineProps<{ year: number; preview: boolean; disabled?: boolean }>()
const open = useState('advent-prizes-open', () => false)
const remembered = useState<string[]>('advent-prizes-seen', () => [])
const { open: installOpen } = useInstall()
const namePrompt = useState('name-prompt', () => 'pending')
const pushPrompt = useState('push-prompt', () => null)
const releasePending = useState('release-news-pending', () => false)
const giftPending = useState('advent-gift-pending', () => false)
const badgeSheet = useState('badge-sheet-open', () => false)
const animation = useState('daily-game-animation', () => false)
const mounted = ref(false)
const autoPending = ref(true)
const storageKey = computed(
  () => `stenbygaard-advent-prizes:${props.year}${props.preview ? ':preview' : ''}`,
)
const blocked = computed(() =>
  Boolean(
    props.disabled ||
    installOpen.value ||
    namePrompt.value !== 'done' ||
    pushPrompt.value ||
    releasePending.value ||
    giftPending.value ||
    badgeSheet.value ||
    animation.value,
  ),
)
function remember() {
  if (!remembered.value.includes(storageKey.value)) remembered.value.push(storageKey.value)
  try {
    localStorage.setItem(storageKey.value, '1')
  } catch {}
}
function show() {
  if (blocked.value) return
  autoPending.value = false
  open.value = true
  remember()
}
function close() {
  open.value = false
}
watch(storageKey, () => {
  autoPending.value = true
})
watchEffect(() => {
  if (!mounted.value || !autoPending.value) return
  let seen = remembered.value.includes(storageKey.value)
  try {
    seen ||= localStorage.getItem(storageKey.value) === '1'
  } catch {}
  if (seen) {
    autoPending.value = false
    return
  }
  if (!blocked.value) show()
})
onMounted(() => {
  mounted.value = true
})
onBeforeUnmount(close)
</script>
<template>
  <div class="prize-showcase-entry">
    <button
      class="prize-link"
      type="button"
      :disabled="blocked"
      @click="show"
    >
      Se kalenderens præmier
    </button>
    <AppDialog
      v-if="open"
      label="Kalenderens præmier"
      @close="close"
    >
      <section class="prize-showcase">
        <header>
          <div>
            <span class="eyebrow">JULEKALENDER {{ year }}</span>
            <h2>Det kan du finde</h2>
          </div>
          <button
            class="close"
            type="button"
            aria-label="Luk præmieoversigten"
            @click="close"
          >
            ×
          </button>
        </header>
        <img
          src="/games/advent/prizes-showcase-v1.webp"
          width="1536"
          height="1024"
          alt="Kalenderens bananer, Mix Max, Faxe Kondi, træstammer, vin, cykeldrikkedunk, gaver, drillenisse og julemand blandt gran og julelys"
        />
        <div class="prize-copy">
          <p>
            Bananer, rigtige præmier og gaver til dig selv og vennerne. Men pas på drillenissen —
            han kan finde på at tage bananer!
          </p>
          <button
            class="btn"
            type="button"
            @click="close"
          >
            Til kalenderen
          </button>
        </div>
      </section>
    </AppDialog>
  </div>
</template>
<style scoped>
.prize-link {
  display: block;
  margin: 2px auto 0;
  padding: 5px 12px;
  border: 0;
  background: transparent;
  color: var(--muted);
  font-size: 11px;
  text-decoration: underline;
  text-underline-offset: 3px;
}
.prize-link:disabled {
  opacity: 0.45;
}
.prize-showcase header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 20px 20px 16px;
}
.eyebrow {
  color: var(--muted);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.12em;
}
h2 {
  margin: 5px 0 0;
  font-size: 24px;
  color: var(--title);
}
.close {
  flex: none;
  width: 40px;
  height: 40px;
  border: 1px solid var(--hairline);
  border-radius: 12px;
  color: var(--text);
  background: var(--surface-2);
  font-size: 26px;
}
.prize-showcase img {
  display: block;
  width: 100%;
  height: auto;
  object-fit: contain;
}
.prize-copy {
  padding: 16px 20px 20px;
}
.prize-copy p {
  margin: 0 0 16px;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.6;
}
.prize-copy .btn {
  width: 100%;
}
</style>
