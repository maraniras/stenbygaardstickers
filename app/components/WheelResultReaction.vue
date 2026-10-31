<script setup lang="ts">
defineProps<{ kind: 'miv' | 'win' | 'jackpot'; animate?: boolean }>()
</script>
<template>
  <div
    class="wheel-reaction"
    :class="[kind, { animate }]"
    aria-hidden="true"
  >
    <svg
      v-if="kind === 'miv'"
      viewBox="0 0 120 94"
      class="sad-cat"
    >
      <ellipse
        cx="60"
        cy="85"
        rx="32"
        ry="5"
        fill="#0002"
      />
      <path
        d="M27 42 21 13Q20 9 26 12L44 25M76 25 96 12Q101 10 100 16L94 43"
        fill="#aaa0bb"
        stroke="#d4c8df"
        stroke-width="2"
      />
      <path
        d="M26 18 30 35 39 27M93 19 81 28 92 35"
        fill="#d6aabb"
      />
      <path
        d="M23 49Q22 25 60 24 98 25 98 51V62Q96 84 60 84 24 84 23 62Z"
        fill="#b6adc6"
        stroke="#d7cce2"
        stroke-width="2"
      />
      <path
        d="M46 27 49 38M60 25V37M74 27 71 38"
        stroke="#82758f"
        stroke-width="4"
        stroke-linecap="round"
      />
      <ellipse
        cx="46"
        cy="65"
        rx="13"
        ry="11"
        fill="#d9d0e1"
      />
      <ellipse
        cx="73"
        cy="65"
        rx="13"
        ry="11"
        fill="#d9d0e1"
      />
      <path
        d="M33 50Q40 58 48 51M71 51Q79 58 87 50"
        fill="none"
        stroke="#4a3c5e"
        stroke-width="3"
        stroke-linecap="round"
      />
      <path
        d="M54 60Q60 56 66 60L60 66Z"
        fill="#926a87"
      />
      <path
        d="M60 66V70M53 74Q60 68 67 74"
        fill="none"
        stroke="#6a516f"
        stroke-width="2"
        stroke-linecap="round"
      />
      <path
        d="M39 65 12 60M39 70 11 72M82 65 108 60M82 70 109 72"
        stroke="#cdbed7"
        stroke-width="2"
        stroke-linecap="round"
      />
      <path
        class="tear"
        d="M85 55Q77 66 85 69 94 65 85 55Z"
        fill="#8dcbdc"
        stroke="#c4eef4"
      />
      <path
        d="M30 56 34 61M87 61 91 56"
        stroke="#dfb0c4"
        stroke-width="3"
        stroke-linecap="round"
        opacity=".7"
      />
    </svg>
    <div
      v-else
      class="banana-burst"
    >
      <span
        v-for="n in 6"
        :key="n"
        :style="{ '--ray': `${n * 60}deg` }"
        >✦</span
      ><img
        src="/badges/banana-baron.webp"
        alt=""
      />
    </div>
  </div>
</template>
<style scoped>
.wheel-reaction {
  display: grid;
  place-items: center;
  height: 68px;
  margin: 0 0 7px;
}
.sad-cat {
  width: 97px;
  height: 76px;
}
.banana-burst {
  position: relative;
  display: grid;
  place-items: center;
  width: 68px;
  height: 68px;
}
.banana-burst img {
  width: 54px;
  height: 54px;
  object-fit: contain;
  filter: drop-shadow(0 3px 8px #d6a44d35);
}
.banana-burst > span {
  position: absolute;
  color: #d9b66d;
  font-size: 12px;
  transform: rotate(var(--ray)) translateY(-31px);
}
.jackpot .banana-burst > span {
  color: #987031;
}
.animate .banana-burst {
  animation: banana-pop 0.65s cubic-bezier(0.2, 0.8, 0.3, 1.4);
}
.animate .sad-cat {
  animation: cat-sigh 0.8s ease-out;
}
.animate .tear {
  animation: cat-tear 1.2s ease-in 2;
  transform-origin: 85px 56px;
}
@keyframes banana-pop {
  from {
    opacity: 0;
    transform: scale(0.4) rotate(-20deg);
  }
  to {
    opacity: 1;
    transform: scale(1) rotate(0);
  }
}
@keyframes cat-sigh {
  0% {
    transform: translateY(-7px) rotate(-5deg);
  }
  65% {
    transform: translateY(3px) rotate(3deg);
  }
  100% {
    transform: translateY(0) rotate(0);
  }
}
@keyframes cat-tear {
  0%,
  30% {
    opacity: 0;
    transform: translateY(-2px) scale(0.7);
  }
  55% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: translateY(14px) scale(0.9);
  }
}
@media (prefers-reduced-motion: reduce) {
  .animate .banana-burst,
  .animate .sad-cat,
  .animate .tear {
    animation: none;
  }
}
</style>
