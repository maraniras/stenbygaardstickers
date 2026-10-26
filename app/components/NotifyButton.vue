<script setup lang="ts">
// Klokken på listen: fører til Notifikationer. Fyldt, når denne enhed får beskeder.
const { on, refresh } = usePush('all')
const { name, badgePush } = useUser()
const active = computed(() => on.value || (Boolean(name.value) && badgePush.value))

onMounted(refresh)
</script>

<template>
  <NuxtLink
    class="bell"
    :class="{ on: active }"
    to="/notifikationer"
    aria-label="Notifikationer"
    title="Notifikationer"
  >
    <svg viewBox="0 0 24 24"><path d="M6 9a6 6 0 1 1 12 0c0 5 2 6.5 2 6.5H4S6 14 6 9Z" /><path d="M10 19a2 2 0 0 0 4 0" /></svg>
  </NuxtLink>
</template>

<style scoped>
/* Samme form som RefreshButton */
.bell {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--glass);
  -webkit-backdrop-filter: blur(20px);
  backdrop-filter: blur(20px);
  box-shadow: var(--shadow-sm);
  color: var(--muted);
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
