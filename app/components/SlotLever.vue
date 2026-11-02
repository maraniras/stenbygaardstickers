<script setup lang="ts">
const props = defineProps<{ disabled: boolean }>()
const emit = defineEmits<{ spin: [] }>()
const pull = ref(0)
let pointer: number | undefined,
  start = 0,
  ignoreClick = false
function down(e: PointerEvent) {
  if (props.disabled || !e.isPrimary || e.button !== 0) return
  pointer = e.pointerId
  start = e.clientY
  ignoreClick = false
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
}
function move(e: PointerEvent) {
  if (e.pointerId === pointer) pull.value = Math.max(0, Math.min(55, e.clientY - start))
}
function end(e: PointerEvent, cancelled = false) {
  if (pointer !== e.pointerId) return
  const pulled = pull.value >= 24
  pointer = undefined
  pull.value = 0
  if (cancelled) {
    ignoreClick = true
    return
  }
  if (pulled && !props.disabled) {
    ignoreClick = true
    emit('spin')
  }
}
function click(e: MouseEvent) {
  if (!props.disabled && (!ignoreClick || e.detail === 0)) emit('spin')
  ignoreClick = false
}
watch(
  () => props.disabled,
  () => {
    pointer = undefined
    pull.value = 0
  },
)
</script>
<template>
  <button
    class="lever"
    :disabled="disabled"
    aria-label="Træk eller tryk på håndtaget for at spinne"
    :style="{ '--pull': `${pull}px` }"
    @pointerdown="down"
    @pointermove="move"
    @pointerup="end($event)"
    @pointercancel="end($event, true)"
    @lostpointercapture="end($event, true)"
    @click="click"
  >
    <span class="rod" /><span class="ball" /><span class="base" />
  </button>
</template>
<style scoped>
.lever {
  position: relative;
  width: 40px;
  min-width: 40px;
  height: 150px;
  border: 0;
  padding: 0;
  align-self: center;
  background: transparent;
  cursor: pointer;
  touch-action: none;
  user-select: none;
}
.rod {
  position: absolute;
  width: 9px;
  height: 87px;
  left: 16px;
  top: 25px;
  border-radius: 6px;
  background: linear-gradient(90deg, #8c622c, #fff0b5 45%, #c49345);
  transform-origin: bottom;
  transform: translateY(calc(var(--pull) * 0.35)) rotate(calc(var(--pull) * -0.45deg));
}
.ball {
  position: absolute;
  left: 3px;
  top: 5px;
  width: 35px;
  height: 35px;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 25%, #d0a1ff, #8752b6 40%, #412556 80%);
  box-shadow:
    inset 0 1px 3px #fff8,
    0 3px 5px #160e242f;
  transform: translateY(var(--pull));
}
.base {
  position: absolute;
  left: 9px;
  top: 103px;
  width: 23px;
  height: 31px;
  border-radius: 8px;
  background: linear-gradient(90deg, #95703d, #ffdda1, #9a7137);
}
.lever:disabled {
  cursor: default;
  opacity: 0.55;
}
.lever:focus-visible {
  outline: 3px solid var(--accent);
  outline-offset: 3px;
  border-radius: 15px;
}
@media (max-height: 700px) {
  .lever {
    height: 108px;
    width: 34px;
    min-width: 34px;
  }
  .rod {
    left: 14px;
    top: 18px;
    height: 65px;
    width: 8px;
  }
  .ball {
    left: 3px;
    top: 4px;
    width: 29px;
    height: 29px;
  }
  .base {
    left: 8px;
    top: 79px;
    width: 22px;
    height: 25px;
  }
}
</style>
