<script setup lang="ts">
const props = withDefaults(defineProps<{ value: number; size?: number }>(), { size: 64 })
const dots = computed(
  () =>
    [[], [5], [1, 9], [1, 5, 9], [1, 3, 7, 9], [1, 3, 5, 7, 9], [1, 3, 4, 6, 7, 9]][
      props.value
    ] ?? [5],
)
</script>
<template>
  <span
    class="parcel-die"
    :style="{ '--die-size': `${size}px` }"
    aria-hidden="true"
    ><span
      v-for="n in 9"
      :key="n"
      :class="{ lit: dots.includes(n) }"
  /></span>
</template>
<style scoped>
.parcel-die {
  display: grid;
  grid-template: repeat(3, 1fr) / repeat(3, 1fr);
  gap: calc(var(--die-size) * 0.08);
  width: var(--die-size);
  height: var(--die-size);
  padding: calc(var(--die-size) * 0.17);
  border-radius: calc(var(--die-size) * 0.18);
  background: linear-gradient(135deg, #fffdf5, #f4e2bc);
  box-shadow:
    inset 2px 2px 3px #fff,
    inset -3px -3px 6px #99793d50,
    0 5px 0 #b7a179,
    0 9px 18px #0003;
  flex-shrink: 0;
}
.parcel-die > span {
  border-radius: 50%;
  background: transparent;
}
.parcel-die > span.lit {
  background: #56343d;
  box-shadow:
    inset 1px 2px 2px #0005,
    0 1px 1px #fff;
}
</style>
