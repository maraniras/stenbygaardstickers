<script setup lang="ts">
const props = withDefaults(defineProps<{ used?: number; total: number }>(), { used: undefined })
const complete = computed(() => props.used !== undefined && props.used >= props.total)
const description = computed(() =>
  props.used === undefined
    ? 'Dagens slag hentes'
    : props.used === 0
      ? `Ikke slået endnu · 0 af ${props.total} slag brugt i dag`
      : complete.value
        ? `Færdig i dag · alle ${props.total} slag brugt`
        : `${props.used} af ${props.total} slag brugt i dag`,
)
</script>

<template>
  <span
    class="player-rolls"
    role="img"
    :class="{ complete }"
    :aria-label="description"
    :title="description"
  >
    <span
      class="roll-pips"
      aria-hidden="true"
    >
      <i
        v-for="roll in total"
        :key="roll"
        :class="{ used: used !== undefined && roll <= used }"
      />
    </span>
    <span aria-hidden="true">{{ used ?? '—' }}/{{ total }} slag</span>
  </span>
</template>

<style scoped>
.player-rolls {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  padding: 5px 8px;
  border-radius: 20px;
  background: var(--surface-2);
  color: var(--muted);
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}
.player-rolls.complete {
  color: light-dark(#24663e, #a1e4b5);
  background: light-dark(#e1f3e6, #173b29);
}
.roll-pips {
  display: flex;
  gap: 3px;
}
.roll-pips i {
  width: 5px;
  height: 5px;
  border: 1px solid currentColor;
  border-radius: 50%;
}
.roll-pips i.used {
  background: currentColor;
}
</style>
