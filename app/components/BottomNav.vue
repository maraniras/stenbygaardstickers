<script setup lang="ts">
const route = useRoute()
const { name } = useUser()
const tab = computed(() => {
  if (route.path === '/') return 'map'
  if (route.path === '/mig' || (name.value && route.path === personUrl(name.value))) return 'me'
  return 'list'
})
</script>

<template>
  <nav class="nav glass">
    <NuxtLink to="/" :class="{ on: tab === 'map' }">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4 3 6.5v13.5l6-2.5 6 2.5 6-2.5V4l-6 2.5L9 4Zm0 0v13.5m6-11V20" /></svg>
      Kort
    </NuxtLink>
    <NuxtLink to="/liste" :class="{ on: tab === 'list' }">
      <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="7" rx="2" /><rect x="4" y="14" width="16" height="6" rx="2" /></svg>
      Stickers
    </NuxtLink>
    <NuxtLink to="/mig" :class="{ on: tab === 'me' }">
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
  display: flex;
  gap: 4px;
  padding: 5px;
  border-radius: 999px;
  transform: translateX(-50%);
}
a {
  display: flex;
  align-items: center;
  gap: 7px;
  height: 48px;
  padding: 0 17px;
  border-radius: 999px;
  font-weight: 700;
  font-size: 15px;
  text-decoration: none;
  white-space: nowrap;
  color: var(--muted);
  transition: background .2s, color .2s;
}
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
</style>
