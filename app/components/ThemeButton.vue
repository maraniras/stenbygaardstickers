<script setup lang="ts">
// Midlertidig knap til at prøve temaerne: halloween → jul → normal
const { theme, cycle } = useTheme()
const icon = computed(() => ({ halloween: '🎃', jul: '🎄', normal: '☀️' })[theme.value])
const label = computed(() => ({ halloween: 'Halloween', jul: 'Jul', normal: 'Normalt' })[theme.value])
</script>

<template>
  <button class="theme-btn" :aria-label="`Tema: ${label}. Tryk for at skifte`" :title="`Tema: ${label}`" @click="cycle">
    {{ icon }}
  </button>
</template>

<style scoped>
/* Samme form som RefreshButton */
.theme-btn {
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
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
}
.theme-btn:active { transform: scale(.92); }
</style>
