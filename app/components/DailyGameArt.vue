<script setup lang="ts">
defineProps<{ kind: 'city' | 'wheel' }>()
</script>

<template>
  <div class="game-art" :class="kind" aria-hidden="true">
    <template v-if="kind === 'city'">
      <div class="city-grid" />
      <div class="river" />
      <div class="avenue" />
      <div class="radar radar-outer" />
      <div class="radar radar-inner" />
      <span class="map-dot dot-a" /><span class="map-dot dot-b" /><span class="map-dot dot-c" />
      <span class="coordinate">57° ?′ N &nbsp; 09° ?′ E</span>
      <div class="emil"><img src="/marker.png" alt=""><span>?</span></div>
      <span class="crosshair">+</span>
    </template>
    <template v-else>
      <span class="spark spark-a">✦</span><span class="spark spark-b">✧</span>
      <div class="wheel-wrap">
        <div class="wheel">
          <span v-for="(symbol, i) in ['🍌', '×', '🍌', '✦', '🍌', '×', '🍌', '✦']" :key="i" class="wheel-symbol" :style="{ '--slice': i }">{{ symbol }}</span>
          <div class="wheel-hub"><img src="/marker.png" alt=""></div>
        </div>
        <span class="pointer" />
      </div>
      <span class="coin coin-a">🍌</span><span class="coin coin-b">🍌</span>
    </template>
  </div>
</template>

<style scoped>
.game-art { position: relative; overflow: hidden; isolation: isolate; }
.city { height: 150px; background: #153b3a; }
.city::after { content: ''; position: absolute; inset: 0; z-index: 1; background: linear-gradient(90deg, rgba(8, 31, 32, .55), transparent 65%); pointer-events: none; }
.city-grid { position: absolute; inset: -75%; transform: rotate(-22deg); background: repeating-linear-gradient(0deg, transparent 0 28px, #64877755 28px 31px, transparent 31px 70px, #64877744 70px 75px), repeating-linear-gradient(90deg, #355c48 0 21px, #77957866 21px 25px, #274b3d 25px 60px, #77957866 60px 64px); }
.river { position: absolute; top: -60%; left: 24%; width: 58px; height: 240%; background: #6fa9b0; transform: rotate(-38deg); box-shadow: 0 0 0 5px #a8c0a53b; }
.avenue { position: absolute; top: 48%; left: -10%; width: 120%; height: 7px; background: #c2c8a5a6; transform: rotate(-22deg); box-shadow: 0 0 0 2px #203d37; }
.radar { position: absolute; left: 70%; top: 47%; aspect-ratio: 1; border: 1px solid #e4fbc648; border-radius: 50%; transform: translate(-50%, -50%); }
.radar-outer { width: 230px; }.radar-inner { width: 145px; background: #ccf5b610; }
.coordinate { position: absolute; bottom: 14px; left: 18px; z-index: 2; color: #d0e6d6; font-size: 10px; font-weight: 600; letter-spacing: .12em; }
.emil { position: absolute; left: 70%; top: 45%; z-index: 2; width: 76px; height: 92px; transform: translate(-50%, -50%) rotate(9deg); }
.emil img { width: 100%; height: 100%; object-fit: contain; filter: drop-shadow(0 7px 7px #071c2690); }
.emil span { position: absolute; right: -12px; top: 1px; display: grid; place-items: center; width: 32px; height: 32px; background: #e6f5bc; border-radius: 12px 12px 12px 2px; color: #153b3a; font-size: 22px; font-weight: 800; transform: rotate(-9deg); }
.map-dot { position: absolute; width: 6px; height: 6px; border-radius: 50%; background: #d4efc8; box-shadow: 0 0 0 4px #d4efc81a; }.dot-a { top: 26%; left: 28%; }.dot-b { top: 73%; left: 53%; }.dot-c { top: 23%; right: 10%; }
.crosshair { position: absolute; bottom: 14px; right: 16px; color: #d0e6d6; font-size: 20px; line-height: 1; }
.wheel { position: relative; width: 142px; height: 142px; border: 6px solid #ffd563; border-radius: 50%; background: conic-gradient(from -22.5deg, #ffdc73 0 45deg, #784c9f 45deg 90deg, #ffb776 90deg 135deg, #b2a0d5 135deg 180deg, #ffdc73 180deg 225deg, #784c9f 225deg 270deg, #ffb776 270deg 315deg, #b2a0d5 315deg 360deg); box-shadow: 0 8px 0 #1b153e26, 0 14px 22px #1b153e26; transform: rotate(-12deg); }
.wheel-wrap { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); }
.wheel-symbol { position: absolute; top: 50%; left: 50%; width: 24px; height: 24px; display: grid; place-items: center; margin: -12px; transform: rotate(calc(var(--slice) * 45deg)) translateY(-47px) rotate(calc(var(--slice) * -45deg)); color: #fff3cc; font-size: 18px; font-weight: 800; }
.wheel-hub { position: absolute; inset: 42px; display: grid; place-items: center; border-radius: 50%; background: #fff1bb; box-shadow: 0 2px 5px #34224e40; }
.wheel-hub img { width: 32px; height: 36px; object-fit: contain; transform: rotate(12deg); }
.pointer { position: absolute; left: 50%; top: -7px; width: 20px; height: 25px; background: #fff3c4; clip-path: polygon(0 0, 100% 0, 50% 100%); transform: translateX(-50%); filter: drop-shadow(0 2px 1px #1b153e33); }
.coin { position: absolute; display: grid; place-items: center; width: 30px; height: 30px; border: 2px solid #ffe38c; border-radius: 50%; background: #ffcb51; font-size: 17px; box-shadow: 0 4px 0 #d3933e; }
.coin-a { right: 5%; bottom: 18%; transform: rotate(17deg); }.coin-b { left: 8%; top: 19%; transform: rotate(-17deg) scale(.75); }
.spark { position: absolute; color: #9d76c8; }.spark-a { top: 12%; right: 14%; font-size: 19px; }.spark-b { left: 9%; bottom: 16%; font-size: 28px; }
.game-art.wheel { width: auto; height: 168px; border: 0; border-radius: 0; background: light-dark(#f1e9ff, #30253f); box-shadow: none; transform: none; }
</style>
