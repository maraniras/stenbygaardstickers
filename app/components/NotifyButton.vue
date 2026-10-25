<script setup lang="ts">
// Klokken på listen: besked om nye stickers til/fra (se PushPrompt.vue)
const mode = useState<string | null>('push-prompt', () => null)
const { on, busy, refresh, disable } = usePush('all')

onMounted(refresh)

async function click() {
  if (needsHomeScreen()) return void (mode.value = 'ios')
  if (!pushSupported()) return void (mode.value = 'unsupported')
  if (on.value) {
    await disable().catch(() => {})
    mode.value = 'off'
    return
  }
  mode.value = Notification.permission === 'denied' ? 'blocked' : 'ask'
}
</script>

<template>
  <button
    class="bell"
    :class="{ on }"
    :disabled="busy"
    :aria-label="on ? 'Slå besked om nye stickers fra' : 'Få besked om nye stickers'"
    :title="on ? 'Du får besked om nye stickers' : 'Få besked om nye stickers'"
    @click="click"
  >
    <svg viewBox="0 0 24 24"><path d="M6 9a6 6 0 1 1 12 0c0 5 2 6.5 2 6.5H4S6 14 6 9Z" /><path d="M10 19a2 2 0 0 0 4 0" /></svg>
  </button>
</template>

<style scoped>
/* Samme form som RefreshButton */
.bell {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: var(--glass);
  -webkit-backdrop-filter: blur(20px);
  backdrop-filter: blur(20px);
  box-shadow: var(--shadow-sm);
  color: var(--muted);
  cursor: pointer;
}
.bell:active { transform: scale(.92); }
.bell.on { background: var(--accent); color: var(--on-accent); }
svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.bell.on svg { fill: currentColor; }
</style>
