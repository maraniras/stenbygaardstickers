<script setup lang="ts">
const props = defineProps<{
  rotation: number
  spinning: boolean
  jackpot?: number
  enabled: boolean
}>()
const emit = defineEmits<{ spin: [direction: 1 | -1] }>()
const dragging = ref(false)
const offset = ref(0)
let pointer:
  | {
      id: number
      x: number
      y: number
      cx: number
      cy: number
      angle: number
      maxDistance: number
      element: HTMLElement
    }
  | undefined
let suppressClick = false

function release() {
  const previous = pointer
  pointer = undefined
  dragging.value = false
  if (previous?.element.hasPointerCapture(previous.id))
    previous.element.releasePointerCapture(previous.id)
}
function cancel() {
  release()
  offset.value = 0
  suppressClick = true
}
watch(
  () => props.enabled,
  (enabled) => {
    if (!enabled && pointer) cancel()
  },
)
watch(
  () => props.rotation,
  () => {
    offset.value = 0
  },
)
watch(
  () => props.spinning,
  (spinning) => {
    if (!spinning) offset.value = 0
  },
)
onBeforeUnmount(release)

function down(event: PointerEvent) {
  if (!props.enabled || pointer || !event.isPrimary || event.button !== 0) return
  const element = event.currentTarget as HTMLElement
  const rect = element.getBoundingClientRect()
  const cx = rect.left + rect.width / 2,
    cy = rect.top + rect.height / 2
  pointer = {
    id: event.pointerId,
    x: event.clientX,
    y: event.clientY,
    cx,
    cy,
    angle: Math.atan2(event.clientY - cy, event.clientX - cx),
    maxDistance: 0,
    element,
  }
  offset.value = 0
  suppressClick = false
  dragging.value = true
  element.setPointerCapture(event.pointerId)
}
function move(event: PointerEvent) {
  if (!pointer || event.pointerId !== pointer.id) return
  const dx = event.clientX - pointer.x,
    dy = event.clientY - pointer.y
  pointer.maxDistance = Math.max(pointer.maxDistance, Math.hypot(dx, dy))
  if (Math.hypot(event.clientX - pointer.cx, event.clientY - pointer.cy) > 15) {
    const angle = Math.atan2(event.clientY - pointer.cy, event.clientX - pointer.cx)
    // Wrap through ±180 degrees without the wheel jumping a full turn.
    const delta =
      (Math.atan2(Math.sin(angle - pointer.angle), Math.cos(angle - pointer.angle)) * 180) / Math.PI
    offset.value = Math.max(-150, Math.min(150, offset.value + delta))
    pointer.angle = angle
  }
}
function up(event: PointerEvent) {
  if (!pointer || event.pointerId !== pointer.id) return
  move(event)
  const distance = pointer.maxDistance
  release()
  suppressClick = distance > 8
  if (distance >= 32 && props.enabled) emit('spin', offset.value < 0 ? -1 : 1)
  else offset.value = 0
}
function lost(event: PointerEvent) {
  if (pointer?.id === event.pointerId) cancel()
}
function click(event: MouseEvent) {
  if (!props.enabled) return
  // Native keyboard clicks have detail=0. A drag's follow-up click must not spin again.
  if (suppressClick && (event.detail !== 0 || ('pointerType' in event && event.pointerType))) {
    suppressClick = false
    return
  }
  emit('spin', 1)
}
</script>
<template>
  <button
    type="button"
    class="wheel-input"
    :class="{ dragging, busy: spinning }"
    :disabled="!enabled"
    :aria-busy="spinning"
    aria-label="Drej lykkehjulet — tryk eller træk og slip"
    @pointerdown="down"
    @pointermove="move"
    @pointerup="up"
    @pointercancel="lost"
    @lostpointercapture="lost"
    @click="click"
    @dragstart.prevent
  >
    <WheelFace
      fit
      :rotation="rotation + offset"
      :spinning="spinning"
      :jackpot="jackpot"
    />
  </button>
</template>
<style scoped>
.wheel-input {
  display: grid;
  place-items: center;
  width: min(100%, calc(100dvh - 330px), 320px);
  aspect-ratio: 1;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: inherit;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  cursor: grab;
}
.wheel-input.dragging {
  cursor: grabbing;
}
.wheel-input:disabled {
  cursor: default;
}
.wheel-input:focus-visible {
  outline: 3px solid #ffdf86;
  outline-offset: 5px;
}
.wheel-input:not(.dragging):not(.busy) :deep(.disk) {
  transition: transform 0.18s ease-out;
}
@supports (width: 1cqh) {
  .wheel-input {
    width: min(100cqw, 100cqh, 320px);
  }
}
@media (prefers-reduced-motion: reduce) {
  .wheel-input:not(.dragging):not(.busy) :deep(.disk) {
    transition-duration: 0.01s;
  }
}
</style>
