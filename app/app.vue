<script setup lang="ts">
const { unlocked } = useUnlock()
const { ready, failed, reload } = useStickers()

// Sæsontema på <html>, så CSS-variablerne skifter overalt
const { theme } = useTheme()
watchEffect(() => { document.documentElement.dataset.theme = theme.value })

// Det er .content og ikke vinduet der scroller, så Vue Router kan ikke selv nulstille.
// Nye sider starter øverst; med tilbage-knappen kommer man tilbage hvor man var.
const content = ref<HTMLElement>()
const router = useRouter()
const saved = new Map<string, number>()
let back = false
if (import.meta.client) window.addEventListener('popstate', () => { back = true })
router.beforeEach((_to, from) => {
  if (content.value) saved.set(from.fullPath, content.value.scrollTop)
})
useNuxtApp().hook('page:finish', () => {
  if (content.value) content.value.scrollTop = back ? saved.get(router.currentRoute.value.fullPath) ?? 0 : 0
  back = false
})
</script>

<template>
  <LockScreen v-if="!unlocked" />
  <div v-else-if="!ready" class="loading">
    <img src="/marker.png" alt="" :class="{ pulse: !failed }">
    <template v-if="failed">
      <p>Kunne ikke hente stickers</p>
      <button class="btn" @click="reload()">Prøv igen</button>
    </template>
  </div>
  <div v-else class="shell">
    <main ref="content" class="content">
      <NuxtPage />
    </main>
    <BottomNav />
    <ThemeDecor />
    <PushPrompt />
  </div>
</template>

<style scoped>
.shell {
  position: relative;
  height: 100%;
}
.content {
  height: 100%;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  height: 100%;
  color: var(--muted);
  font-weight: 600;
}
.loading img { width: 72px; }
.loading p { margin: 0; }
.pulse { animation: pulse 1s ease-in-out infinite alternate; }
@keyframes pulse { to { transform: scale(.88); opacity: .6; } }
</style>
