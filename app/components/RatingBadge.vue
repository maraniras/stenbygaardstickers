<script setup lang="ts">
const props = defineProps<{ stickerId: string }>()
const { ratings } = useRatings()
const r = computed(() => ratings.value[props.stickerId])
</script>

<template>
  <span v-if="r?.count" class="badge">
    <svg viewBox="0 0 24 24"><path d="m12 2.8 2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3L2.9 9.5l6.3-.9z" /></svg>
    {{ r.avg.toLocaleString('da-DK', { maximumFractionDigits: 1, minimumFractionDigits: 1 }) }}
  </span>
</template>

<style scoped>
.badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-weight: 700;
}
svg {
  width: 14px;
  height: 14px;
  fill: var(--star);
}
</style>
