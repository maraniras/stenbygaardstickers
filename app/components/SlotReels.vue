<script setup lang="ts">
import { SLOT_SYMBOLS } from '../../shared/utils/slots'
import { SLOT_STOP_MS } from '../composables/useSlotPresentation'
defineProps<{ positions: number[]; rolling: boolean }>()
const strip = Array.from({ length: 63 }, (_, i) => SLOT_SYMBOLS[i % SLOT_SYMBOLS.length]!)
</script>
<template>
  <div
    class="reels"
    :class="{ rolling }"
    aria-label="Banandittens tre hjul"
    :aria-busy="rolling"
  >
    <div
      v-for="(position, i) in positions"
      :key="i"
      class="reel"
      :style="{ '--position': position, '--duration': `${SLOT_STOP_MS[i]}ms` }"
    >
      <div
        class="strip"
        aria-hidden="true"
      >
        <div
          v-for="(symbol, j) in strip"
          :key="j"
          class="symbol"
        >
          <img
            :src="`/games/bananditten/${symbol.id}.webp`"
            alt=""
            draggable="false"
          />
        </div>
      </div>
    </div>
    <span
      class="payline"
      aria-hidden="true"
    />
  </div>
</template>
<style scoped>
.reels {
  --row-height: clamp(70px, 20vw, 96px);
  position: relative;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  border: 5px solid #c99a4f;
  border-radius: 19px;
  background: #b08747;
  box-shadow:
    0 3px 0 #79522d,
    0 12px 24px #130d252b,
    inset 0 0 0 2px #fff1b9;
  overflow: hidden;
}
.reel {
  height: calc(var(--row-height) * 3);
  overflow: hidden;
  position: relative;
  background: linear-gradient(#bcaed3, #fff9e9 34%, #fff9e9 66%, #bcaed3);
}
.reel::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(#30223970, transparent 35%, transparent 65%, #30223970);
}
.strip {
  transform: translateY(calc((1 - var(--position)) * var(--row-height)));
  will-change: transform;
}
.rolling .strip {
  transition: transform var(--duration) cubic-bezier(0.13, 0.65, 0.15, 1);
}
.symbol {
  height: var(--row-height);
  display: grid;
  place-items: center;
}
.symbol img {
  width: 90%;
  height: 90%;
  object-fit: contain;
  user-select: none;
}
.payline {
  position: absolute;
  inset: calc(var(--row-height) + 1px) 0 auto;
  height: var(--row-height);
  border-top: 2px solid #e6b75e;
  border-bottom: 2px solid #e6b75e;
  box-shadow: 0 0 14px #ffd97944;
  pointer-events: none;
}
@media (max-height: 700px) {
  .reels {
    --row-height: clamp(42px, calc((100dvh - 430px) / 3), 66px);
  }
}
@media (prefers-reduced-motion: reduce) {
  .rolling .strip {
    transition: none;
  }
}
</style>
