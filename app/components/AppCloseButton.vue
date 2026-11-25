<script setup lang="ts">
withDefaults(defineProps<{ label?: string }>(), { label: 'Luk' })
</script>

<template>
  <button
    type="button"
    :aria-label="label"
  >
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  </button>
</template>

<style scoped>
button {
  display: grid;
  place-items: center;
  flex: none;
  width: 40px;
  height: 40px;
  padding: 0;
  border: 1px solid var(--hairline);
  border-radius: 12px;
  background: var(--surface-2);
  color: var(--text);
  line-height: 1;
}
svg {
  display: block;
  width: 20px;
  height: 20px;
  pointer-events: none;
}
path {
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
}
</style>
