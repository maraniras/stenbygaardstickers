<script setup lang="ts">
const props = defineProps<{ stickerId: string }>()
const { ratings, enabled, rate } = useRatings()
const r = computed(() => ratings.value[props.stickerId])
const hover = ref(0)
const shown = computed(() => hover.value || r.value?.mine || 0)
</script>

<template>
  <section v-if="enabled" class="rating">
    <div class="head">
      <span class="eyebrow">{{ r?.mine ? 'Din vurdering' : 'Giv stjerner' }}</span>
      <span v-if="r?.count" class="avg">
        <svg viewBox="0 0 24 24"><path d="m12 2.8 2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3L2.9 9.5l6.3-.9z" /></svg>
        {{ r.avg.toLocaleString('da-DK', { maximumFractionDigits: 1, minimumFractionDigits: 1 }) }}
        <span>({{ r.count }})</span>
      </span>
    </div>
    <div class="stars" @pointerleave="hover = 0">
      <button
        v-for="n in 5"
        :key="n"
        :class="{ on: n <= shown }"
        :aria-label="`${n} ${n === 1 ? 'stjerne' : 'stjerner'}`"
        @pointerenter="hover = n"
        @click="rate(stickerId, n)"
      >
        <svg viewBox="0 0 24 24"><path d="m12 2.8 2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3L2.9 9.5l6.3-.9z" /></svg>
      </button>
    </div>
  </section>
</template>

<style scoped>
.rating {
  padding: 16px 18px 12px;
  border-radius: var(--radius);
  background: var(--surface);
  box-shadow: var(--shadow-sm);
}
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.avg {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-weight: 800;
}
.avg span { font-weight: 500; color: var(--muted); }
.avg svg { width: 16px; height: 16px; fill: var(--star); }
.stars {
  display: flex;
  justify-content: space-between;
  margin-top: 6px;
}
.stars button {
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
  touch-action: manipulation;
}
.stars svg {
  width: 38px;
  height: 38px;
  fill: var(--surface-2);
  transition: fill .15s, transform .2s cubic-bezier(.3, 1.6, .5, 1);
}
.stars button.on svg { fill: var(--star); }
.stars button:active svg { transform: scale(1.25); }
</style>
