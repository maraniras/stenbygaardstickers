<script setup lang="ts">
// Stickers er bygget ind i appen, så nye pins kræver bare en genindlæsning
const spinning = ref(false)

function refresh() {
  spinning.value = true
  window.location.reload()
}
</script>

<template>
  <button class="refresh" :class="{ spinning }" aria-label="Opdater" title="Opdater" @click="refresh">
    <svg viewBox="0 0 24 24"><path d="M20 12a8 8 0 1 1-2.3-5.6M20 4v5h-5" /></svg>
  </button>
</template>

<style scoped>
.refresh {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: var(--glass);
  -webkit-backdrop-filter: blur(20px);
  backdrop-filter: blur(20px);
  box-shadow: var(--shadow-sm);
  color: var(--muted);
  cursor: pointer;
}
.refresh:active { transform: scale(.92); }
svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.spinning svg { animation: spin .8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
