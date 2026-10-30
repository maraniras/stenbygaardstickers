<template>
  <NuxtLink class="upload glass" to="/upload" aria-label="Tilføj sticker" title="Tilføj sticker">
    <span class="upload-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 20H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8l-6 6Z" /><path d="M14 20v-4a2 2 0 0 1 2-2h4M8 9h6M11 6v6" /></svg></span>
    <span>Tilføj sticker</span>
  </NuxtLink>
</template>

<style scoped>
/* Fælles tilføj-knap over bundmenuen på kort og liste. */
.upload {
  position: fixed;
  right: max(16px, env(safe-area-inset-right, 0px));
  bottom: calc(var(--nav-space) + 8px);
  z-index: 650;
  display: flex;
  align-items: center;
  gap: 8px;
  height: 48px;
  padding: 6px 15px 6px 7px;
  border-radius: 999px;
  box-shadow: var(--shadow-sm);
  color: var(--text);
  text-decoration: none;
  font-size: 13px;
  font-weight: 750;
  white-space: nowrap;
  transition: transform .15s, box-shadow .15s;
}
.upload-icon { display:grid; place-items:center; width:34px; height:34px; border-radius:50%; background:var(--ink); color:#fff; }
.upload:active { transform: scale(.96); }
.upload:focus-visible { outline: 3px solid var(--text); outline-offset: 4px; }
svg {
  width: 21px;
  height: 21px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}
@media(prefers-reduced-motion:reduce) { .upload { transition:none; } }
</style>
