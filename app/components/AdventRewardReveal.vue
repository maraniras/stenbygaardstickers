<script setup lang="ts">
import type { AdventOpening } from '../../shared/types/advent'
import { adventPrizeIcon } from '../../shared/utils/advent-rewards'
const props = defineProps<{ opening: AdventOpening }>()
const emit = defineEmits<{ finished: [] }>()
const prizes = computed(() => [props.opening.prize, ...(props.opening.extras ?? [])])
const special = computed(
  () =>
    prizes.value.find((prize) => prize.kind === 'physical') ??
    prizes.value.find((prize) => prize.reward === 'santa'),
)
const motif = computed(() => special.value ?? props.opening.prize)
const elf = computed(() => !special.value && motif.value.reward === 'elf')
const gift = computed(() => motif.value.kind === 'friend-gift')
const title = computed(() =>
  special.value?.kind === 'physical'
    ? 'En rigtig julepræmie!'
    : motif.value.reward === 'santa'
      ? 'Du fandt julemanden!'
      : elf.value
        ? 'Nissen var på spil…'
        : gift.value
          ? 'Glæd en ven!'
          : motif.value.reward === 'self-gift'
            ? 'Den her er til dig!'
            : 'Julebananer!',
)
const amount = computed(() =>
  gift.value && motif.value.kind === 'friend-gift'
    ? `${motif.value.amount} 🍌 til en ven`
    : `${props.opening.amount < 0 ? '−' : '+'}${Math.abs(props.opening.amount).toLocaleString('da-DK')} 🍌`,
)
const animation = useState('daily-game-animation', () => false)
let timer: ReturnType<typeof setTimeout> | undefined
onMounted(() => {
  animation.value = true
  if (special.value) void shootConfetti().catch(() => {})
  timer = setTimeout(() => emit('finished'), special.value ? 3800 : 2800)
})
onBeforeUnmount(() => {
  clearTimeout(timer)
  animation.value = false
})
</script>
<template>
  <div
    :class="['reward-reveal', { elf, rare: special }]"
    aria-hidden="true"
  >
    <div class="glow" />
    <div class="sparkles">
      <i
        v-for="n in 12"
        :key="n"
        :style="{ '--n': n, left: `${8 + ((n * 29) % 84)}%`, top: `${8 + ((n * 17) % 76)}%` }"
        >✦</i
      >
    </div>
    <div
      v-if="elf"
      class="stolen-bananas"
    >
      <img
        v-for="n in 3"
        :key="n"
        src="/games/advent/banana-single-christmas-v2.webp"
        alt=""
        :style="{ '--n': n }"
      />
    </div>
    <div class="reveal-content">
      <span class="eyebrow">LÅGE {{ opening.day }}</span>
      <img
        class="reveal-motif"
        :src="adventPrizeIcon(motif)"
        alt=""
      />
      <b>{{ title }}</b>
      <span
        v-if="special?.kind === 'physical'"
        class="real-prize"
        >{{ special.description }}</span
      >
      <strong
        v-if="opening.amount !== 0 || gift || elf"
        :class="{ loss: opening.amount < 0 }"
        >{{ elf && opening.amount === 0 ? 'Dit lager var tomt!' : amount }}</strong
      >
      <small v-if="elf && opening.amount < 0">Han smuttede med dine bananer.</small>
      <div
        v-if="opening.extras?.length"
        class="bundle"
      >
        <img
          v-for="(prize, index) in prizes"
          :key="index"
          :src="adventPrizeIcon(prize)"
          alt=""
        />
      </div>
    </div>
  </div>
</template>
<style scoped>
.reward-reveal {
  position: absolute;
  inset: 0;
  z-index: 12;
  overflow: hidden;
  border-radius: inherit;
  display: grid;
  place-items: center;
  pointer-events: none;
  color: #fff1cf;
  background: radial-gradient(ellipse, #153027f7 10%, #14231fe8 65%, #111b19df);
  animation: reveal-in 0.35s ease-out both;
}
.reward-reveal.elf {
  background: radial-gradient(ellipse, #422731f5, #201b27ed);
}
.reveal-content {
  position: relative;
  z-index: 2;
  width: 90%;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}
.eyebrow {
  font-size: 10px;
  letter-spacing: 0.2em;
  color: #f7d78d;
}
.reveal-motif {
  width: min(62%, 220px);
  aspect-ratio: 1;
  object-fit: contain;
  filter: drop-shadow(0 10px 24px #0005);
  animation: gift-pop 0.8s cubic-bezier(0.2, 0.8, 0.2, 1.2) both;
}
.rare .reveal-motif {
  animation:
    gift-pop 1s cubic-bezier(0.2, 0.8, 0.2, 1.2) both,
    treasure-float 2s 1s ease-in-out infinite;
}
.elf .reveal-motif {
  animation: elf-sneak 1.2s ease-out both;
}
b {
  font-family: Georgia, serif;
  font-size: clamp(20px, 6vw, 28px);
  text-shadow: 0 2px 8px #0007;
}
strong {
  color: #9ce4b1;
  font-size: 29px;
  animation: amount-pop 0.55s 0.5s both;
}
strong.loss {
  color: #f6a3a8;
}
small,
.real-prize {
  max-width: 250px;
  font-size: 13px;
  line-height: 1.5;
  color: #f2e0bd;
}
.glow {
  position: absolute;
  width: 260px;
  aspect-ratio: 1;
  border-radius: 50%;
  background: radial-gradient(circle, #f2c65a35, transparent 70%);
  animation: treasure-glow 1.7s ease-in-out infinite alternate;
}
.sparkles {
  position: absolute;
  inset: 0;
}
.sparkles i {
  position: absolute;
  color: #ffda83;
  font-style: normal;
  font-size: 15px;
  animation: sparkle 1.6s calc(var(--n) * -0.15s) ease-in-out infinite;
}
.elf .sparkles {
  display: none;
}
.stolen-bananas {
  position: absolute;
  inset: 0;
  z-index: 3;
}
.stolen-bananas img {
  position: absolute;
  width: 55px;
  top: 65%;
  left: calc(15% + var(--n) * 14%);
  animation: steal-banana 1.3s calc(var(--n) * 0.15s) ease-in both;
}
.bundle {
  display: flex;
  justify-content: center;
  gap: 3px;
  flex-wrap: wrap;
}
.bundle img {
  width: 40px;
  height: 40px;
  object-fit: contain;
}
@keyframes reveal-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
@keyframes gift-pop {
  0% {
    opacity: 0;
    transform: translateY(30px) scale(0.45) rotate(-12deg);
  }
  65% {
    opacity: 1;
    transform: translateY(-8px) scale(1.08) rotate(4deg);
  }
  100% {
    transform: none;
  }
}
@keyframes amount-pop {
  from {
    opacity: 0;
    transform: translateY(12px) scale(0.85);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
@keyframes elf-sneak {
  0% {
    opacity: 0;
    transform: translateX(-110px) rotate(-20deg);
  }
  65% {
    opacity: 1;
    transform: translateX(10px) rotate(5deg);
  }
  100% {
    transform: none;
  }
}
@keyframes steal-banana {
  0% {
    opacity: 0;
    transform: translateY(30px) rotate(-20deg);
  }
  20% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: translate(110px, -140px) scale(0.25) rotate(50deg);
  }
}
@keyframes treasure-float {
  50% {
    transform: translateY(-7px) rotate(2deg);
  }
}
@keyframes treasure-glow {
  to {
    transform: scale(1.3);
    opacity: 0.5;
  }
}
@keyframes sparkle {
  0%,
  100% {
    opacity: 0.2;
    transform: scale(0.6);
  }
  50% {
    opacity: 1;
    transform: scale(1.25);
  }
}
@media (prefers-reduced-motion: reduce) {
  .reward-reveal,
  .reward-reveal * {
    animation: none !important;
  }
  .stolen-bananas {
    display: none;
  }
}
</style>
