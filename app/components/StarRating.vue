<script setup lang="ts">
// 1–5 👍 på en sticker. Tryk på samme antal igen for at fjerne sin vurdering.
// Ens egne stickers kan man ikke give 👍 (tjekkes også på serveren).
const props = defineProps<{ stickerId: string; placedBy: string[] }>()
const { ratings, enabled, error, rate } = useRatings()
const { isMe } = useUser()
const r = computed(() => ratings.value[props.stickerId])
const own = computed(() => props.placedBy.some(isMe))
const hover = ref(0)
const shown = computed(() => hover.value || r.value?.mine || 0)
const avg = computed(() =>
  r.value?.avg.toLocaleString('da-DK', { maximumFractionDigits: 1, minimumFractionDigits: 1 }),
)
function chooseRating(value: number) {
  void rate(props.stickerId, value)
  hover.value = 0
}
</script>

<template>
  <section
    v-if="enabled"
    class="rating"
  >
    <div class="head">
      <span class="eyebrow">{{ own ? 'Din sticker' : r?.mine ? 'Din vurdering' : 'Giv 👍' }}</span>
      <span
        v-if="r?.count"
        class="avg"
        >👍 {{ avg }} <span>({{ r.count }})</span></span
      >
    </div>
    <p
      v-if="own"
      class="own"
    >
      Du kan ikke give 👍 til dine egne stickers – det er de andres tur.
    </p>
    <div
      v-else
      class="thumbs"
      @pointerleave="hover = 0"
    >
      <button
        v-for="n in 5"
        :key="n"
        :class="{ on: n <= shown }"
        :aria-label="`${n} 👍${r?.mine === n ? ' – tryk igen for at fjerne' : ''}`"
        :aria-pressed="r?.mine === n"
        @pointerenter="hover = n"
        @click="chooseRating(n)"
      >
        👍
      </button>
    </div>
    <p
      v-if="!own && r?.mine"
      class="hint"
    >
      Tryk på {{ r.mine }} igen for at fjerne din vurdering
    </p>
    <p
      v-if="error"
      class="err"
    >
      {{ error }}
    </p>
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
  font-weight: 800;
}
.avg span {
  font-weight: 500;
  color: var(--muted);
}
.thumbs {
  display: flex;
  justify-content: space-between;
  margin-top: 6px;
}
.thumbs button {
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  padding: 0;
  border: 0;
  background: none;
  font-size: 32px;
  line-height: 1;
  cursor: pointer;
  touch-action: manipulation;
  filter: grayscale(1);
  opacity: 0.3;
  transition:
    filter 0.15s,
    opacity 0.15s,
    transform 0.2s cubic-bezier(0.3, 1.6, 0.5, 1);
}
.thumbs button.on {
  filter: none;
  opacity: 1;
}
.thumbs button:active {
  transform: scale(1.25);
}
.own,
.hint,
.err {
  margin: 8px 0 4px;
  font-size: 13px;
  color: var(--muted);
}
.hint {
  margin: 2px 0 0;
  text-align: center;
}
.err {
  color: #c62828;
  font-weight: 600;
}
</style>
