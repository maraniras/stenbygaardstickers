<template>
  <NuxtLink class="upload" to="/upload" aria-label="Tilføj sticker" title="Tilføj sticker">
    <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg>
  </NuxtLink>
</template>

<style scoped>
/* Samme form som RefreshButton */
.upload {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--glass);
  -webkit-backdrop-filter: blur(20px);
  backdrop-filter: blur(20px);
  box-shadow: var(--shadow-sm);
  color: var(--muted);
}
.upload:active { transform: scale(.92); }
svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.4;
  stroke-linecap: round;
}
</style>
