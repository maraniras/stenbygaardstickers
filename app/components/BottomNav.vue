<script setup lang="ts">
const route = useRoute()
const onList = computed(() => route.path.startsWith('/liste'))
</script>

<template>
  <nav class="nav">
    <NuxtLink to="/" :class="{ on: !onList }">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4 3 6.5v13.5l6-2.5 6 2.5 6-2.5V4l-6 2.5L9 4Zm0 0v13.5m6-11V20" /></svg>
      Kort
    </NuxtLink>
    <NuxtLink to="/liste" :class="{ on: onList }">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5v14M5 6h0M5 12h0M5 18h0M9 6h11M9 12h11M9 18h11" /><circle cx="5" cy="6" r="1.6" /><circle cx="5" cy="12" r="1.6" /><circle cx="5" cy="18" r="1.6" /></svg>
      Tidslinje
    </NuxtLink>
  </nav>
</template>

<style scoped>
.nav {
  flex: none;
  display: flex;
  gap: 10px;
  height: calc(var(--nav-h) + var(--safe-b));
  padding: 8px 16px calc(8px + var(--safe-b));
  border-top: 2.5px solid var(--ink);
  background: var(--paper);
  z-index: 1000;
}
a {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 999px;
  font-weight: 800;
  text-decoration: none;
  color: var(--muted);
}
a.on {
  background: var(--yellow);
  color: var(--ink);
  border: 2.5px solid var(--ink);
}
svg {
  width: 22px;
  height: 22px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
circle { fill: currentColor; stroke: none; }
</style>
