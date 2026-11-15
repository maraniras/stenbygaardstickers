<script setup lang="ts">
import type { RouletteNumber } from '../../shared/types/roulette'
import { ROULETTE_WHEEL, rouletteColour } from '../../shared/utils/roulette'

const props = defineProps<{ spinning?: boolean; result?: RouletteNumber; round?: number }>()
const emit = defineEmits<{ settled: [round: number]; tick: [] }>()
const isSettled = ref(false)
const rotation = ref(0)
const spinSpeed = 0.2 // Degrees per millisecond; braking starts at the same speed.
const landingDuration = 3200
const step = 360 / ROULETTE_WHEEL.length
const colours = { green: '#15714d', red: '#ac3546', black: '#172d28' }
function point(angle: number, radius: number) {
  const radians = (angle * Math.PI) / 180
  return { x: 180 + Math.sin(radians) * radius, y: 180 - Math.cos(radians) * radius }
}
const segments = ROULETTE_WHEEL.map((number, i) => {
  const a = point(i * step - step / 2, 155)
  const b = point(i * step + step / 2, 155)
  return { number, angle: i * step, path: `M180 180 L${a.x} ${a.y} A155 155 0 0 1 ${b.x} ${b.y} Z` }
})
let frame = 0
let previousTime = 0
let reduced = false
let landingVersion = 0
let landingRound: number | undefined
let tickPocket = 0
function rotate(angle: number) {
  rotation.value = angle
  const pocket = Math.floor(angle / step)
  if (pocket !== tickPocket) {
    tickPocket = pocket
    if (!reduced) emit('tick')
  }
}
function landed(version: number, round: number | undefined) {
  if (round === undefined || version !== landingVersion || landingRound !== round) return
  landingRound = undefined
  isSettled.value = true
  emit('settled', round)
}
function animate(time: number) {
  if (previousTime) rotate(rotation.value + Math.min(time - previousTime, 50) * spinSpeed)
  previousTime = time
  frame = requestAnimationFrame(animate)
}
function update() {
  const version = ++landingVersion
  cancelAnimationFrame(frame)
  landingRound = undefined
  isSettled.value = false
  previousTime = 0
  tickPocket = Math.floor(rotation.value / step)
  if (props.spinning && !reduced) frame = requestAnimationFrame(animate)
  else if (props.result !== undefined) {
    const target = (360 - ROULETTE_WHEEL.indexOf(props.result) * step) % 360
    const start = rotation.value
    let distance = (target - (start % 360) + 360) % 360
    // Avoid stopping abruptly when the target is immediately under the pointer.
    if (distance < 90) distance += 360
    landingRound = props.round
    const round = landingRound
    if (reduced) {
      rotation.value = start + distance
      landed(version, round)
    } else {
      const started = performance.now()
      // This curve has the existing spin velocity at its start and slows continuously to zero.
      const power = (spinSpeed * landingDuration) / distance
      const brake = (time: number) => {
        if (version !== landingVersion) return
        const progress = Math.min(1, Math.max(0, (time - started) / landingDuration))
        rotate(start + distance * (1 - (1 - progress) ** power))
        if (progress < 1) frame = requestAnimationFrame(brake)
        else landed(version, round)
      }
      frame = requestAnimationFrame(brake)
    }
  }
}
let media: MediaQueryList | undefined
function preference() {
  reduced = media?.matches ?? false
  update()
}
onMounted(() => {
  media = window.matchMedia('(prefers-reduced-motion: reduce)')
  media.addEventListener('change', preference)
  preference()
})
watch(() => [props.spinning, props.result, props.round], update)
onBeforeUnmount(() => {
  landingVersion++
  cancelAnimationFrame(frame)
  media?.removeEventListener('change', preference)
})
</script>

<template>
  <div
    class="wheel"
    role="img"
    :aria-label="
      result !== undefined
        ? isSettled
          ? `Hjulet viser ${result}`
          : 'Roulettehjulet lander'
        : spinning
          ? 'Roulettehjulet drejer. Resultatet afventes.'
          : 'Amerikansk roulettehjul med 0 og 00'
    "
  >
    <span
      class="pointer"
      aria-hidden="true"
      >▼</span
    >
    <svg
      viewBox="0 0 360 360"
      aria-hidden="true"
    >
      <circle
        cx="180"
        cy="180"
        r="172"
        fill="#573c25"
        stroke="#d9ba75"
        stroke-width="8"
      />
      <g
        :class="{ spinning }"
        class="rotor"
        :style="{ transform: `rotate(${rotation}deg)` }"
      >
        <path
          v-for="segment in segments"
          :key="segment.number"
          :d="segment.path"
          :fill="colours[rouletteColour(segment.number)]"
          stroke="#dfc58b"
          stroke-width="0.7"
        />
        <text
          v-for="segment in segments"
          :key="`text-${segment.number}`"
          x="180"
          y="43"
          text-anchor="middle"
          :transform="`rotate(${segment.angle} 180 180)`"
          fill="#fff8e5"
          font-size="12"
          font-weight="700"
        >
          {{ segment.number }}
        </text>
      </g>
      <circle
        cx="180"
        cy="180"
        r="115"
        fill="#b68c49"
        stroke="#f0d495"
        stroke-width="3"
      />
      <circle
        cx="180"
        cy="180"
        r="105"
        fill="#174b3b"
        stroke="#73522f"
        stroke-width="5"
      />
      <circle
        cx="180"
        cy="180"
        r="79"
        fill="none"
        stroke="#d6b76b"
        stroke-opacity="0.3"
      />
      <path
        d="M180 110V250M110 180H250"
        stroke="#e1bf76"
        stroke-width="9"
        stroke-linecap="round"
      />
      <circle
        cx="180"
        cy="180"
        r="24"
        fill="#edcf88"
        stroke="#94703a"
        stroke-width="4"
      />
      <circle
        cx="180"
        cy="25"
        r="5"
        fill="#fffdf0"
        stroke="#c8b991"
      />
    </svg>
  </div>
</template>

<style scoped>
.wheel {
  position: relative;
  width: min(100%, 360px);
  margin: 0 auto;
  filter: drop-shadow(0 12px 12px #001b1d66);
}
svg {
  display: block;
  width: 100%;
}
.pointer {
  position: absolute;
  z-index: 1;
  top: -3px;
  left: 50%;
  transform: translateX(-50%);
  color: #ffe4a3;
  font-size: 24px;
  text-shadow: 0 2px 3px #000;
}
.rotor {
  transform-origin: 180px 180px;
  will-change: transform;
}
</style>
