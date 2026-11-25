<script setup lang="ts">
defineProps<{ started?: boolean; winner?: unknown }>()
</script>

<template>
  <span
    v-if="started && !winner"
    class="game-live"
    role="status"
    aria-label="Live · spillet er åbent og har endnu ingen vinder"
  >
    <span
      class="live-dot"
      aria-hidden="true"
    />LIVE
  </span>
</template>

<style scoped>
.game-live {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  flex: none;
  padding: 5px 10px;
  border: 1px solid color-mix(in srgb, #2fa76b 35%, var(--hairline));
  border-radius: 999px;
  background: color-mix(in srgb, #2fa76b 12%, var(--surface));
  color: var(--text);
  font-size: 11px;
  font-weight: 800;
  line-height: 1.2;
  letter-spacing: 0.08em;
}
.live-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #2fa76b;
  box-shadow: 0 0 0 3px color-mix(in srgb, #2fa76b 15%, transparent);
}
</style>
