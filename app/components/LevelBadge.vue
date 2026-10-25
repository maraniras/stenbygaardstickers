<script setup lang="ts">
// Level-badge i stil med Garmin: sekskantet skjold med level-nummeret og en farve pr.
// level (grå → grøn → blå → lilla → rød → orange → guld). Level 10 får en stjerne.
const props = withDefaults(defineProps<{ level: number, size?: number }>(), { size: 28 })

// [lys, mørk] pr. level 1–10
const COLORS: [string, string][] = [
  ['#b9bec6', '#7d838c'],
  ['#7fd67a', '#3e9b3a'],
  ['#4fd1c5', '#1f8f86'],
  ['#6aa8ff', '#2f6fd6'],
  ['#8f8cff', '#4f4bc7'],
  ['#c58bff', '#8a3fd1'],
  ['#ff7fb3', '#c2185b'],
  ['#ff8a65', '#d84315'],
  ['#ffb74d', '#e67e00'],
  ['#f5c542', '#a87400'],
]

const id = useId()
const lv = computed(() => Math.min(10, Math.max(1, props.level)))
const c = computed(() => COLORS[lv.value - 1]!)
</script>

<template>
  <svg class="level-badge" :width="size" :height="size" viewBox="0 0 40 44" role="img" :aria-label="`Level ${lv}`">
    <defs>
      <linearGradient :id="`lb-${id}`" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" :stop-color="c[0]" />
        <stop offset="1" :stop-color="c[1]" />
      </linearGradient>
    </defs>
    <!-- Ydre sekskant, hvid kant og indre sekskant -->
    <path d="M20 1.5 37.3 11.5v21L20 42.5 2.7 32.5v-21Z" :fill="c[1]" />
    <path d="M20 4 35.1 12.75v18.5L20 40 4.9 31.25v-18.5Z" fill="#fff" />
    <path d="M20 6.4 33 13.9v16.2L20 37.6 7 30.1V13.9Z" :fill="`url(#lb-${id})`" />
    <path d="M20 6.4 33 13.9v6.6C26 18 14 18 7 20.5v-6.6Z" fill="#fff" opacity=".18" />
    <path v-if="lv === 10" d="m20 9.2 1.3 2.7 3 .4-2.2 2 .5 2.9-2.6-1.4-2.6 1.4.5-2.9-2.2-2 3-.4Z" fill="#fff" opacity=".9" />
    <text x="20" :y="lv === 10 ? 31 : 28.5" text-anchor="middle" font-size="16" font-weight="800" fill="#fff" stroke="rgba(0,0,0,.18)" stroke-width=".6" paint-order="stroke">{{ lv }}</text>
  </svg>
</template>

<style scoped>
.level-badge {
  flex: none;
  display: block;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, .2));
  font-family: inherit;
}
</style>
