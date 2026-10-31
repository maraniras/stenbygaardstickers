<script setup lang="ts">
const props = defineProps<{ stickerId: string }>()
const { ratings } = useRatings()
const r = computed(() => ratings.value[props.stickerId])
</script>

<template>
  <span
    v-if="r?.count"
    class="badge"
  >
    👍 {{ r.avg.toLocaleString('da-DK', { maximumFractionDigits: 1, minimumFractionDigits: 1 }) }}
  </span>
</template>

<style scoped>
.badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-weight: 700;
  white-space: nowrap;
}
</style>
