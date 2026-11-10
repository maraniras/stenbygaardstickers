<script setup lang="ts">
defineProps<{ stage: 'rolling' | 'result' | null; value: number }>()
</script>
<template>
  <Teleport to="body"
    ><Transition name="dice-overlay"
      ><div
        v-if="stage"
        class="dice-overlay"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        aria-label="Terningeslag"
      >
        <div
          class="dice-spotlight"
          :class="{ six: stage === 'result' && value === 6 }"
        >
          <span class="roll-kicker">{{
            stage === 'rolling' ? 'KOM SÅ, SEKSER…' : 'DIT SLAG'
          }}</span>
          <div class="dice-stage">
            <div
              v-if="stage === 'rolling'"
              class="dice-bounce"
            >
              <div class="dice-cube">
                <div
                  v-for="face in 6"
                  :key="face"
                  class="cube-face"
                  :class="`face-${face}`"
                >
                  <ParcelDie
                    :value="face"
                    :size="120"
                  />
                </div>
              </div>
            </div>
            <div
              v-else
              class="landed-die"
            >
              <ParcelDie
                :value="value"
                :size="120"
              />
            </div>
          </div>
          <h2>
            {{
              stage === 'rolling'
                ? 'Terningen ruller'
                : value === 6
                  ? 'Sekser!'
                  : `Du slog ${value}`
            }}
          </h2>
          <p>
            {{
              stage === 'rolling'
                ? 'Hvem skal af med en pakke?'
                : value === 6
                  ? 'Nu må du vælge en pakke.'
                  : 'Ingen pakke denne gang.'
            }}
          </p>
        </div>
      </div></Transition
    ></Teleport
  >
</template>
<style scoped>
.dice-overlay {
  position: fixed;
  inset: 0;
  z-index: 1600;
  display: grid;
  place-items: center;
  background: #0b1715dc;
  backdrop-filter: blur(9px);
  padding: 24px;
  color: #fff1d2;
  pointer-events: all;
}
.dice-spotlight {
  text-align: center;
  width: min(100%, 350px);
  padding: 36px 12px;
  background: radial-gradient(ellipse at center, #e6c36722, transparent 68%);
  border-radius: 50%;
}
.roll-kicker {
  font-size: 10px;
  letter-spacing: 0.2em;
  font-weight: 850;
  color: #efd194;
}
.dice-stage {
  height: 230px;
  display: grid;
  place-items: center;
  perspective: 850px;
}
.dice-bounce {
  animation: dice-hop 0.8s ease-in-out infinite;
}
.dice-cube {
  width: 120px;
  height: 120px;
  position: relative;
  transform-style: preserve-3d;
  animation: dice-tumble 1.1s linear infinite;
}
.cube-face {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
}
.face-1 {
  transform: translateZ(60px);
}
.face-2 {
  transform: rotateY(180deg) translateZ(60px);
}
.face-3 {
  transform: rotateY(90deg) translateZ(60px);
}
.face-4 {
  transform: rotateY(-90deg) translateZ(60px);
}
.face-5 {
  transform: rotateX(90deg) translateZ(60px);
}
.face-6 {
  transform: rotateX(-90deg) translateZ(60px);
}
.cube-face :deep(.parcel-die) {
  box-shadow:
    inset 2px 2px 4px #fff,
    inset -3px -3px 6px #99793d50;
  border-radius: 16px;
}
.landed-die {
  transform: rotate(-8deg);
  animation: dice-land 0.4s ease-out;
}
.dice-spotlight h2 {
  font-size: 30px;
  margin: 8px 0;
  color: inherit;
}
.dice-spotlight p {
  font-size: 14px;
  color: #d1c7af;
  min-height: 22px;
}
.six {
  background: radial-gradient(ellipse at center, #f2c96540, transparent 72%);
}
.six h2 {
  color: #ffe29c;
}
.dice-overlay-enter-active,
.dice-overlay-leave-active {
  transition: opacity 0.18s;
}
.dice-overlay-enter-from,
.dice-overlay-leave-to {
  opacity: 0;
}
@keyframes dice-tumble {
  to {
    transform: rotateX(720deg) rotateY(540deg) rotateZ(180deg);
  }
}
@keyframes dice-hop {
  50% {
    transform: translateY(-20px) scale(1.06);
  }
}
@keyframes dice-land {
  0% {
    transform: translateY(-25px) rotate(16deg) scale(1.1);
  }
  65% {
    transform: translateY(6px) rotate(-12deg);
  }
  100% {
    transform: rotate(-8deg);
  }
}
@media (prefers-reduced-motion: reduce) {
  .dice-bounce,
  .dice-cube,
  .landed-die {
    animation: none;
  }
  .dice-cube {
    transform: rotateX(-20deg) rotateY(25deg);
  }
  .dice-overlay-enter-active,
  .dice-overlay-leave-active {
    transition: none;
  }
}
</style>
