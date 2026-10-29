<script setup lang="ts">
const route = useRoute()
const { name } = useUser()
const { readyCount } = useDailyAvailability()
const tab = computed(() => {
  if (route.path === '/') return 'map'
  if (route.path === '/spil' || route.path.startsWith('/spil/') || route.path === '/rangliste') return 'games'
  if (route.path === '/mig' || (name.value && route.path === personUrl(name.value))) return 'me'
  return 'list'
})
</script>

<template>
  <nav class="nav glass" aria-label="Hovedmenu">
    <NuxtLink to="/" :class="{ on: tab === 'map' }" :aria-current="tab === 'map' ? 'page' : undefined">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4 3 6.5v13.5l6-2.5 6 2.5 6-2.5V4l-6 2.5L9 4Zm0 0v13.5m6-11V20" /></svg>
      Kort
    </NuxtLink>
    <NuxtLink to="/liste" :class="{ on: tab === 'list' }" :aria-current="tab === 'list' ? 'page' : undefined">
      <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="7" rx="2" /><rect x="4" y="14" width="16" height="6" rx="2" /></svg>
      Stickers
    </NuxtLink>
    <NuxtLink to="/spil" :class="{ on: tab === 'games' }" :aria-current="tab === 'games' ? 'page' : undefined" :aria-label="readyCount ? `Spil – ${readyCount} daglige spil klar` : 'Spil'">
      <span v-if="readyCount" class="ready-dot" aria-hidden="true" />
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6h8c3 0 4 3 5 9 .5 3-2 4-4 1l-1-1H8l-1 1c-2 3-4.5 2-4-1C4 9 5 6 8 6Z" /><path d="M8 9v5m-2.5-2.5h5" /><circle cx="16" cy="10" r=".8" /><circle cx="18" cy="13" r=".8" /></svg>
      Spil
    </NuxtLink>
    <NuxtLink :to="name ? personUrl(name) : '/mig'" :class="{ on: tab === 'me' }" :aria-current="tab === 'me' ? 'page' : undefined">
      <UserAvatar v-if="name" class="me" :name="name" />
      <svg v-else viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></svg>
      Mig
    </NuxtLink>
  </nav>
</template>

<style scoped>
.nav {
  position: fixed;
  left: 50%;
  bottom: calc(14px + var(--safe-b));
  z-index: 1000;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  width: min(360px, calc(100% - 28px));
  gap: 4px;
  padding: 5px;
  border-radius: 999px;
  transform: translateX(-50%);
}
a {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 3px;
  height: 54px;
  padding: 4px;
  border-radius: 999px;
  font-weight: 700;
  font-size: 12px;
  text-decoration: none;
  white-space: nowrap;
  color: var(--muted);
  transition: background .2s, color .2s;
}
.ready-dot { position: absolute; top: 5px; left: calc(50% + 8px); width: 9px; height: 9px; border: 2px solid var(--surface); border-radius: 50%; background: var(--accent); }
a.on {
  background: var(--ink);
  color: #fff;
}
svg {
  width: 20px;
  height: 20px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.me {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--accent);
  color: var(--on-accent);
  font-size: 12px;
  font-weight: 800;
}
a:focus-visible { outline: 2px solid var(--text); outline-offset: 2px; }
</style>
