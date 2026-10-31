<script setup lang="ts">
const props = defineProps<{ stickerId: string }>()
const { counts } = useCommentCounts()
const n = computed(() => counts.value[props.stickerId] ?? 0)
</script>

<template>
  <span
    v-if="n"
    class="comment-count"
    :title="`${n} ${n === 1 ? 'kommentar' : 'kommentarer'}`"
    >💬 {{ n }}</span
  >
</template>

<style scoped>
.comment-count {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-weight: 700;
  white-space: nowrap;
}
</style>
