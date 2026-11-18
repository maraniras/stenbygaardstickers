<script setup lang="ts">
defineProps<{ done?: boolean; started?: boolean; locked?: string; loading?: boolean }>()
</script>
<template>
  <span
    v-if="done || started || locked || loading"
    class="game-status"
    :class="{ done, started: !done && started, locked }"
    >{{ done ? 'Spillet i dag ✓' : loading ? 'Henter…' : locked || 'I gang' }}</span
  >
</template>
<style scoped>
.game-status {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  padding: 5px 9px;
  border-radius: 99px;
  background: var(--accent-soft);
  color: var(--text);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0;
  line-height: 1.3;
}
.done,
.locked {
  background: var(--surface-2);
  color: var(--muted);
}
.started {
  box-shadow: inset 0 0 0 1px var(--accent);
}
</style>
