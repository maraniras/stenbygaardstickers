<template>
  <NuxtLink
    class="upload glass"
    to="/upload"
    aria-label="Tilføj sticker"
    title="Tilføj sticker"
  >
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  </NuxtLink>
</template>

<style scoped>
/* Shared inline action next to the map/list switch. */
.upload {
  display: grid;
  place-items: center;
  flex: none;
  width: 48px;
  height: 48px;
  border-radius: 16px;
  box-shadow: var(--shadow-sm);
  color: var(--text);
  text-decoration: none;
  font-size: 13px;
  font-weight: 750;
  white-space: nowrap;
  transition:
    transform 0.15s,
    box-shadow 0.15s;
}
.upload:active {
  transform: scale(0.96);
}
.upload:focus-visible {
  outline: 3px solid var(--text);
  outline-offset: 4px;
}
svg {
  width: 21px;
  height: 21px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}
@media (prefers-reduced-motion: reduce) {
  .upload {
    transition: none;
  }
}
</style>
