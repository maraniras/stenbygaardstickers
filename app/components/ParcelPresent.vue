<script setup lang="ts">
const props = defineProps<{
  styleIndex: number
  label: string
  selected?: boolean
  amount?: number
}>()
const shape = computed(() => props.styleIndex % 20)
</script>
<template>
  <span
    class="present"
    :class="[`shape-${shape}`, { selected, unwrapped: amount !== undefined }]"
    :style="{
      '--paper': [
        '#be4659',
        '#437769',
        '#6076ad',
        '#af7d3f',
        '#865c96',
        '#3c9298',
        '#ae634b',
        '#7b8649',
      ][styleIndex % 8],
      '--turn': `${((styleIndex % 3) - 1) * 5}deg`,
    }"
  >
    <svg
      v-if="shape === 16"
      class="novelty-wrap"
      viewBox="0 0 140 110"
      aria-hidden="true"
    >
      <path
        d="M66 46L116 11Q121 7 126 14Q131 20 125 24L76 61"
        fill="var(--paper)"
        stroke="#fff6"
        stroke-width="2"
      />
      <circle
        cx="43"
        cy="69"
        r="35"
        fill="var(--paper)"
        stroke="#fff6"
        stroke-width="2"
      />
      <circle
        cx="43"
        cy="69"
        r="27"
        fill="none"
        stroke="#ffffff40"
        stroke-width="2"
        stroke-dasharray="5 4"
      />
      <path
        d="M10 57L76 81M31 102L55 36M94 23L104 37"
        stroke="#f2d28b"
        stroke-width="9"
      />
      <path
        d="M19 79Q29 96 47 96"
        fill="none"
        stroke="#0002"
        stroke-width="4"
        stroke-linecap="round"
      />
    </svg>
    <svg
      v-if="shape === 17"
      class="novelty-wrap"
      viewBox="0 0 110 125"
      aria-hidden="true"
    >
      <path
        d="M31 14H75L72 73Q73 84 92 89Q105 94 101 113L18 114Q8 111 12 98L30 73Z"
        fill="var(--paper)"
        stroke="#fff6"
        stroke-width="2"
      />
      <rect
        x="28"
        y="8"
        width="50"
        height="16"
        rx="4"
        fill="var(--paper)"
        stroke="#fff6"
        stroke-width="2"
      />
      <path
        d="M52 24L51 86L91 105M15 108H99"
        fill="none"
        stroke="#f2d28b"
        stroke-width="8"
      />
      <path
        d="M35 35L67 49M34 53L66 67M25 87L41 95"
        stroke="#ffffff40"
        stroke-width="5"
      />
      <path
        d="M19 119H100"
        stroke="#8d6b39"
        stroke-width="5"
        stroke-linecap="round"
      />
    </svg>
    <svg
      v-if="shape === 18"
      class="novelty-wrap"
      viewBox="0 0 100 128"
      aria-hidden="true"
    >
      <path
        d="M50 13V86"
        stroke="#0003"
        stroke-width="18"
        stroke-linecap="round"
      />
      <path
        d="M50 13V86"
        stroke="var(--paper)"
        stroke-width="14"
        stroke-linecap="round"
      />
      <path
        d="M44 30L56 24M44 53L56 47"
        stroke="#f2d28b"
        stroke-width="7"
      />
      <path
        d="M15 110Q15 79 50 77Q85 79 85 110Z"
        fill="var(--paper)"
        stroke="#fff6"
        stroke-width="2"
      />
      <rect
        x="10"
        y="107"
        width="80"
        height="14"
        rx="5"
        fill="var(--paper)"
        stroke="#fff6"
        stroke-width="2"
      />
      <path
        d="M50 79V120M24 98H76"
        stroke="#f2d28b"
        stroke-width="8"
      />
      <path
        d="M25 103Q24 89 38 86"
        fill="none"
        stroke="#ffffff40"
        stroke-width="4"
        stroke-linecap="round"
      />
    </svg>
    <svg
      v-if="shape === 19"
      class="novelty-wrap"
      viewBox="0 0 80 132"
      aria-hidden="true"
    >
      <path
        d="M40 106V127"
        stroke="#b58b48"
        stroke-width="10"
        stroke-linecap="round"
      />
      <rect
        x="13"
        y="4"
        width="54"
        height="110"
        rx="12"
        fill="var(--paper)"
        stroke="#fff6"
        stroke-width="2"
      />
      <circle
        cx="40"
        cy="25"
        r="16"
        fill="#b85b61"
        stroke="#fff6"
        stroke-width="2"
      />
      <circle
        cx="40"
        cy="59"
        r="16"
        fill="#d7a64a"
        stroke="#fff6"
        stroke-width="2"
      />
      <circle
        cx="40"
        cy="93"
        r="16"
        fill="#7f9c5e"
        stroke="#fff6"
        stroke-width="2"
      />
      <path
        d="M40 9V109M25 25H55M25 59H55M25 93H55"
        stroke="#f2d28b"
        stroke-width="6"
      />
      <path
        d="M7 12L15 7H65L73 12"
        fill="none"
        stroke="#f2d28b"
        stroke-width="4"
        stroke-linecap="round"
      />
    </svg>
    <svg
      v-if="shape === 12"
      class="novelty-wrap"
      viewBox="0 0 140 112"
      aria-hidden="true"
    >
      <g
        fill="var(--paper)"
        stroke="#fff7"
        stroke-width="2"
      >
        <path d="M59 15C29 37 21 68 39 94L54 99C44 66 50 44 70 22Z" />
        <path d="M77 18C106 36 121 66 111 92L96 102C96 65 84 47 69 26Z" />
        <path d="M65 15C47 44 53 74 77 103L91 98C72 64 73 39 78 20Z" />
      </g>
      <path
        d="M34 49L49 56M29 69L44 74M92 48L109 44M100 70L116 66M57 53L76 52M63 78L81 73"
        stroke="#ffffff50"
        stroke-width="8"
      />
      <path
        d="M59 15L77 10L80 26L65 31Z"
        fill="#aa7351"
      />
      <path
        d="M51 34L88 36"
        stroke="#bc526b"
        stroke-width="11"
        stroke-linecap="round"
      />
    </svg>
    <svg
      v-if="shape === 4"
      class="novelty-wrap"
      viewBox="0 0 90 84"
      aria-hidden="true"
    >
      <path
        d="M45 3L83 22V62L45 81L7 62V22Z"
        fill="var(--paper)"
        stroke="#fff6"
        stroke-width="2"
      />
      <path
        d="M7 22L45 42L83 22L45 3Z"
        fill="#ffffff25"
      />
      <path
        d="M45 3V81M8 48L45 67L82 48"
        fill="none"
        stroke="#f2d28b"
        stroke-width="9"
      />
      <path
        d="M7 29L45 49L83 29"
        fill="none"
        stroke="#0002"
        stroke-width="3"
      />
    </svg>
    <svg
      v-if="shape === 15"
      class="cycle-wrap"
      viewBox="0 0 140 104"
      aria-hidden="true"
    >
      <g
        fill="var(--paper)"
        stroke="#fff6"
        stroke-width="2"
      >
        <circle
          cx="29"
          cy="75"
          r="24"
        />
        <circle
          cx="111"
          cy="75"
          r="24"
        />
      </g>
      <g
        fill="none"
        stroke="#ffffff35"
        stroke-width="3"
        stroke-dasharray="4 5"
      >
        <circle
          cx="29"
          cy="75"
          r="18"
        />
        <circle
          cx="111"
          cy="75"
          r="18"
        />
      </g>
      <path
        d="M8 66L50 84M20 97L38 53M90 66L132 84M102 97L120 53"
        stroke="#f2d28b"
        stroke-width="7"
      />
      <path
        d="M29 75L54 30L79 75H29L65 43H99L111 75M99 43L92 17L107 17M54 30L49 19"
        fill="none"
        stroke="#0004"
        stroke-width="15"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M29 75L54 30L79 75H29L65 43H99L111 75M99 43L92 17L107 17M54 30L49 19"
        fill="none"
        stroke="var(--paper)"
        stroke-width="11"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M42 18H60M92 17H108M64 49L72 62M39 56L48 60M95 32L103 30"
        stroke="#f2d28b"
        stroke-width="7"
        stroke-linecap="round"
      />
      <circle
        cx="79"
        cy="75"
        r="6"
        fill="#f2d28b"
      />
      <path
        d="M79 75L88 84H95"
        fill="none"
        stroke="#e0b967"
        stroke-width="4"
        stroke-linecap="round"
      />
    </svg>
    <svg
      v-if="shape === 11"
      class="banana-wrap"
      viewBox="0 0 140 90"
      aria-hidden="true"
    >
      <path
        d="M14 13C20 42 51 65 84 53C105 46 120 25 123 11L134 18C132 55 114 79 84 83C48 88 17 65 8 35Z"
        fill="var(--paper)"
        stroke="#ffffff55"
        stroke-width="2"
      />
      <path
        d="M19 30C39 71 101 82 124 34"
        fill="none"
        stroke="#0002"
        stroke-width="4"
      />
      <path
        d="M38 45L28 63M58 56L51 77M84 53L87 82M108 38L121 58"
        stroke="#ffffff35"
        stroke-width="9"
      />
      <path
        d="M70 58L69 84"
        stroke="#f6d78f"
        stroke-width="12"
      />
      <path
        d="M122 11L134 18M8 35L14 13"
        stroke="#81512d"
        stroke-width="7"
      />
    </svg>
    <svg
      v-if="shape === 13"
      class="star-wrap"
      viewBox="0 0 100 100"
      aria-hidden="true"
    >
      <path
        d="M50 2L65 33L99 39L75 63L81 98L50 81L19 98L25 63L1 39L35 33Z"
        fill="var(--paper)"
        stroke="#fff5"
        stroke-width="2"
      />
      <path
        d="M50 7V85M12 45L89 45"
        stroke="#f6d78f"
        stroke-width="10"
      />
    </svg>
    <span
      class="bow"
      aria-hidden="true"
    />
    <span
      class="lid"
      aria-hidden="true"
    />
    <span
      class="ribbon"
      aria-hidden="true"
    />
    <span class="tag">{{ amount !== undefined ? `${amount} 🍌` : label }}</span>
  </span>
</template>
<style scoped>
.present {
  position: relative;
  display: inline-flex;
  align-items: flex-end;
  justify-content: center;
  width: calc(var(--gift-width, 68px) * var(--parcel-scale, 1));
  height: calc(var(--gift-height, 65px) * var(--parcel-scale, 1));
  border-radius: 6px;
  background: linear-gradient(115deg, #ffffff20, transparent 55%), var(--paper);
  box-shadow:
    inset -6px -4px 0 #0002,
    0 8px 12px #0003;
  transform: rotate(var(--turn));
  transition:
    transform 0.25s,
    filter 0.25s;
}
.shape-1 {
  --gift-width: 48px;
  --gift-height: 94px;
}
.shape-2 {
  --gift-width: 94px;
  --gift-height: 36px;
}
.shape-3 {
  --gift-width: 73px;
  --gift-height: 73px;
  border-radius: 50%;
}
.shape-3 .lid {
  top: 3px;
  left: 1px;
  right: 1px;
  height: 23px;
  border-radius: 50% 50% 20% 20%;
}
.shape-3 .ribbon {
  top: 4px;
  bottom: 3px;
  border-radius: 4px;
}
.shape-4 {
  --gift-width: 87px;
  --gift-height: 80px;
  background: none;
  box-shadow: none;
}
.shape-5 {
  --gift-width: 45px;
  --gift-height: 88px;
  border-radius: 50% / 10%;
}
.shape-5 .lid {
  height: 17px;
  border-radius: 50%;
}
.shape-5::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 11px;
  border-radius: 50%;
  background: #0001;
}
.shape-6 {
  --gift-width: 65px;
  --gift-height: 78px;
  border-radius: 34% 34% 12% 12%;
}
.shape-6 .lid {
  left: 16%;
  right: 16%;
  top: -3px;
  height: 10px;
  border-radius: 9px 9px 2px 2px;
}
.shape-6 .ribbon {
  width: 9px;
}
.shape-7 {
  --gift-width: 94px;
  --gift-height: 44px;
  border-radius: 30px;
}
.shape-7 .lid {
  left: 5px;
  right: 5px;
  top: -2px;
  height: 13px;
  border-radius: 50%;
}
.shape-7 .ribbon {
  top: -1px;
  bottom: 1px;
}
.shape-8 {
  --gift-width: 112px;
  --gift-height: 108px;
  background:
    radial-gradient(circle, #fff3 2px, transparent 3px) 0 0/18px 18px,
    linear-gradient(115deg, #fff2, transparent 55%),
    var(--paper);
}
.shape-9 {
  --gift-width: 106px;
  --gift-height: 78px;
  border-radius: 50% / 22%;
  background: repeating-linear-gradient(45deg, transparent 0 12px, #fff2 12px 18px), var(--paper);
}
.shape-9 .lid {
  height: 26px;
  top: -5px;
  border-radius: 50%;
  border: 1px solid #ffffff55;
}
.shape-9::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 1px;
  right: 1px;
  height: 15px;
  border-radius: 50%;
  background: #0001;
}
.shape-10 {
  --gift-width: 144px;
  --gift-height: 138px;
  border: 2px solid #efd08a88;
  border-radius: 10px;
  background:
    radial-gradient(circle at 20% 25%, #fff3 1px, transparent 2px) 0 0/15px 15px,
    linear-gradient(135deg, #fff1, #0002),
    var(--paper);
}
.shape-10 .ribbon {
  width: 20px;
}
.shape-10 .lid {
  height: 23px;
  top: -8px;
  border-bottom: 2px solid #e6c77b88;
}
.shape-10 .bow {
  transform: scale(1.4);
  top: -31px;
}
.shape-10 .tag {
  font-size: 13px;
  padding: 5px 9px;
}
.shape-11,
.shape-12 {
  --gift-width: 132px;
  --gift-height: 86px;
  background: none;
  box-shadow: none;
}
.shape-11 {
  --paper: #d6ab4c !important;
}
.shape-12 {
  --paper: #d5b555 !important;
  --gift-width: 106px;
  --gift-height: 88px;
}
.banana-wrap,
.star-wrap {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
  filter: drop-shadow(0 7px 5px #0003);
}
.shape-12 .banana-wrap {
  transform: scaleX(-1);
}
.shape-11 .lid,
.shape-12 .lid,
.shape-11 .ribbon,
.shape-12 .ribbon,
.shape-13 .lid,
.shape-13 .ribbon {
  display: none;
}
.shape-11 .bow,
.shape-12 .bow {
  top: 36%;
  transform: scale(0.8);
}
.shape-11 .tag,
.shape-12 .tag {
  position: absolute;
  bottom: 0;
  margin: 0;
  transform: rotate(-10deg);
}
.shape-13 {
  --gift-width: 86px;
  --gift-height: 86px;
  background: none;
  box-shadow: none;
}
.shape-13 .bow {
  top: -19px;
  transform: scale(0.8);
}
.shape-13 .tag {
  margin-bottom: 17px;
}
.shape-14 {
  --gift-width: 100px;
  --gift-height: 48px;
  border-radius: 18px;
  background: repeating-linear-gradient(45deg, #fff3 0 8px, transparent 8px 18px), var(--paper);
}
.shape-14::before,
.shape-14::after {
  content: '';
  position: absolute;
  width: 20px;
  height: 35px;
  top: 6px;
  left: -15px;
  background: var(--paper);
  clip-path: polygon(0 0, 100% 20%, 65% 50%, 100% 80%, 0 100%, 20% 50%);
}
.shape-15 {
  --gift-width: 112px;
  --gift-height: 83px;
  background: none;
  box-shadow: none;
}
.cycle-wrap {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
  filter: drop-shadow(0 5px 4px #0003);
}
.shape-15 .lid,
.shape-15 .ribbon {
  display: none;
}
.shape-15 .bow {
  top: -12px;
  transform: scale(0.65);
}
.shape-15 .tag {
  position: absolute;
  bottom: -2px;
  margin: 0;
  transform: rotate(-7deg);
}
.novelty-wrap {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
  filter: drop-shadow(0 5px 4px #0003);
}
.shape-16,
.shape-17,
.shape-18,
.shape-19 {
  background: none;
  box-shadow: none;
}
.shape-16 {
  --gift-width: 111px;
  --gift-height: 86px;
}
.shape-17 {
  --gift-width: 76px;
  --gift-height: 91px;
}
.shape-18 {
  --gift-width: 69px;
  --gift-height: 93px;
}
.shape-19 {
  --gift-width: 60px;
  --gift-height: 102px;
}
.shape-4 .lid,
.shape-4 .ribbon,
.shape-16 .lid,
.shape-16 .ribbon,
.shape-17 .lid,
.shape-17 .ribbon,
.shape-18 .lid,
.shape-18 .ribbon,
.shape-19 .lid,
.shape-19 .ribbon {
  display: none;
}
.shape-16 .bow {
  top: 29%;
  left: 15%;
  transform: scale(0.65);
}
.shape-16 .tag {
  position: absolute;
  bottom: 1px;
  left: 14px;
  margin: 0;
}
.shape-17 .bow,
.shape-18 .bow,
.shape-19 .bow {
  top: -16px;
  transform: scale(0.65);
}
.shape-17 .tag,
.shape-18 .tag,
.shape-19 .tag {
  position: absolute;
  bottom: 3px;
  margin: 0;
}
.shape-12 .bow {
  top: 1%;
  transform: scale(0.7);
}
.shape-12 .tag {
  bottom: 0;
  left: 38%;
}
.shape-4 .bow {
  top: -18px;
  transform: scale(0.8);
}
.shape-14::after {
  left: auto;
  right: -15px;
  transform: scaleX(-1);
}
.lid {
  position: absolute;
  top: -4px;
  left: -4px;
  right: -4px;
  height: 16px;
  border-radius: 4px;
  background: var(--paper);
  box-shadow: 0 3px 3px #0003;
}
.ribbon {
  position: absolute;
  top: -4px;
  bottom: 0;
  width: 12px;
  background: linear-gradient(90deg, #d6ad59, #ffe4a1, #c99b42);
}
.bow {
  position: absolute;
  top: -23px;
  width: 46px;
  height: 24px;
  z-index: 1;
  filter: drop-shadow(0 2px 1px #0004);
}
.bow::before,
.bow::after {
  content: '';
  position: absolute;
  width: 23px;
  height: 18px;
  border: 4px solid #f2d28b;
  border-radius: 55% 55% 15% 55%;
  left: 0;
  bottom: 0;
  transform: rotate(22deg);
}
.bow::after {
  left: auto;
  right: 0;
  transform: scaleX(-1) rotate(22deg);
}
.tag {
  z-index: 1;
  background: #fff1d5;
  color: #453724;
  padding: 3px 6px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 800;
  margin-bottom: 9px;
  box-shadow: 0 2px 3px #0002;
}
.selected {
  filter: drop-shadow(0 0 8px #ffd37b);
  transform: translateY(-5px) rotate(var(--turn));
}
.unwrapped {
  background: linear-gradient(130deg, #ca9a3b, #f8db85);
  --paper: #ca9a3b !important;
}
</style>
