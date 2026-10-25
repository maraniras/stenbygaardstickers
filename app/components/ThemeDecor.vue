<script setup lang="ts">
// Pynt til sæsontemaerne: flagermus der flagrer forbi til halloween, sne til jul.
// Ligger over kortet men under knapper og menuer, og kan ikke trykkes på.
const { theme } = useTheme()

// Faste "tilfældige" værdier, så det ikke hopper ved hver render
const rand = (i: number, n: number) => ((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1

const bats = Array.from({ length: 5 }, (_, i) => ({
  top: `${10 + rand(i, 1) * 55}%`,
  size: `${20 + rand(i, 2) * 16}px`,
  duration: `${14 + rand(i, 3) * 10}s`,
  delay: `${-rand(i, 4) * 24}s`,
  reverse: i % 2 === 1,
}))

const flakes = Array.from({ length: 36 }, (_, i) => ({
  left: `${rand(i, 5) * 100}%`,
  size: `${3 + rand(i, 6) * 5}px`,
  duration: `${9 + rand(i, 7) * 9}s`,
  delay: `${-rand(i, 8) * 18}s`,
  drift: `${-30 + rand(i, 9) * 60}px`,
  opacity: 0.55 + rand(i, 10) * 0.4,
}))
</script>

<template>
  <div v-if="theme !== 'normal'" class="decor" aria-hidden="true">
    <template v-if="theme === 'halloween'">
      <span
        v-for="(b, i) in bats"
        :key="i"
        class="bat"
        :class="{ reverse: b.reverse }"
        :style="{ top: b.top, fontSize: b.size, animationDuration: b.duration, animationDelay: b.delay }"
      ><span>🦇</span></span>
    </template>
    <template v-else-if="theme === 'jul'">
      <span
        v-for="(f, i) in flakes"
        :key="i"
        class="flake"
        :style="{ left: f.left, width: f.size, height: f.size, opacity: f.opacity, animationDuration: f.duration, animationDelay: f.delay, '--drift': f.drift }"
      />
    </template>
  </div>
</template>

<style scoped>
.decor {
  position: fixed;
  inset: 0;
  z-index: 450;
  overflow: hidden;
  pointer-events: none;
}
.bat {
  position: absolute;
  left: 0;
  animation: fly linear infinite;
}
.bat span {
  display: inline-block;
  animation: flap .35s ease-in-out infinite alternate;
  filter: drop-shadow(0 2px 3px rgba(0, 0, 0, .3));
}
.bat.reverse { animation-name: fly-back; }
.bat.reverse span { transform: scaleX(-1); }
@keyframes fly {
  0% { transform: translate(-15vw, 0); }
  25% { transform: translate(20vw, -40px); }
  50% { transform: translate(50vw, 20px); }
  75% { transform: translate(80vw, -30px); }
  100% { transform: translate(115vw, 10px); }
}
@keyframes fly-back {
  0% { transform: translate(115vw, 0); }
  25% { transform: translate(80vw, 30px); }
  50% { transform: translate(50vw, -20px); }
  75% { transform: translate(20vw, 35px); }
  100% { transform: translate(-15vw, -10px); }
}
@keyframes flap { to { transform: scaleY(.6); } }
.bat.reverse span { animation-name: flap-r; }
@keyframes flap-r { from { transform: scaleX(-1); } to { transform: scaleX(-1) scaleY(.6); } }

.flake {
  position: absolute;
  top: -10px;
  border-radius: 50%;
  background: #fff;
  /* Blålig kant, så sneen også kan ses på det lyse kort */
  box-shadow: 0 0 0 1px rgba(120, 160, 200, .55), 0 1px 4px rgba(30, 60, 100, .35);
  animation: fall linear infinite;
}
@keyframes fall {
  to { transform: translate(var(--drift), 105vh); }
}

@media (prefers-reduced-motion: reduce) {
  .decor { display: none; }
}
</style>
