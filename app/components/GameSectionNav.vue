<script setup lang="ts">
defineProps<{ section: 'daily' | 'casino' }>()
const { readyCount } = useDailyAvailability()
</script>

<template>
  <nav
    class="game-sections"
    aria-label="Spilområder"
  >
    <NuxtLink
      to="/spil"
      :class="{ active: section === 'daily' }"
      :aria-current="section === 'daily' ? 'page' : undefined"
    >
      Daglige spil
      <span
        v-if="readyCount"
        class="ready"
        :aria-label="`${readyCount} spil klar`"
        >{{ readyCount }}</span
      >
    </NuxtLink>
    <NuxtLink
      to="/spil/casino"
      :class="{ active: section === 'casino' }"
      :aria-current="section === 'casino' ? 'page' : undefined"
      >Casino</NuxtLink
    >
  </nav>
</template>

<style scoped>
.game-sections {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 5px;
  margin: 20px 0;
  padding: 5px;
  border: 1px solid var(--hairline);
  border-radius: 17px;
  background: var(--surface-2);
}
a {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 44px;
  border-radius: 12px;
  text-decoration: none;
  color: var(--muted);
  font-size: 13px;
  font-weight: 750;
}
a.active {
  background: var(--surface);
  color: var(--text);
  box-shadow: var(--shadow-sm);
}
.ready {
  display: grid;
  place-items: center;
  min-width: 19px;
  height: 19px;
  padding: 0 5px;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--text);
  font-size: 10px;
  font-variant-numeric: tabular-nums;
}
a:focus-visible {
  outline: 2px solid var(--text);
  outline-offset: 2px;
}
</style>
