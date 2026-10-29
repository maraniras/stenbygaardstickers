<template>
  <NuxtLink class="upload" to="/upload" aria-label="Tilføj sticker" title="Tilføj sticker">
    <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg>
  </NuxtLink>
</template>

<style scoped>
/* Fælles tilføj-knap over bundmenuen på kort og liste. */
.upload {
  position: fixed;
  right: max(16px, env(safe-area-inset-right, 0px));
  bottom: calc(var(--nav-space) + 8px);
  z-index: 650;
  display: grid;
  place-items: center;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: var(--shadow);
  color: var(--on-accent);
  transition: transform .15s;
}
.upload:active { transform: scale(.92); }
.upload:focus-visible { outline: 3px solid var(--text); outline-offset: 4px; }
svg {
  width: 26px;
  height: 26px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.4;
  stroke-linecap: round;
}
</style>
