<script setup lang="ts">
const { show } = useInstall()
const installed = ref(false)
const version = CHANGELOG.find((release) => release.date)?.version
let displayMode: MediaQueryList | undefined
function syncInstalled() {
  installed.value = isStandalone()
}
function onInstalled() {
  installed.value = true
}
onMounted(() => {
  syncInstalled()
  displayMode = window.matchMedia('(display-mode: standalone)')
  displayMode.addEventListener('change', syncInstalled)
  window.addEventListener('appinstalled', onInstalled)
})
onBeforeUnmount(() => {
  displayMode?.removeEventListener('change', syncInstalled)
  window.removeEventListener('appinstalled', onInstalled)
})
</script>
<template>
  <section
    class="app-settings"
    aria-labelledby="app-settings-title"
  >
    <h2 id="app-settings-title">Appen</h2>
    <NuxtLink
      class="setting-row"
      to="/nyheder"
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path d="M4 3h16v18H4zM8 7h8M8 11h8M8 15h5" />
      </svg>
      <span class="copy"
        ><b>Hvad er nyt?</b
        ><small>{{ version ? `Version ${version} · ` : '' }}Se de seneste opdateringer</small></span
      ><span
        class="arrow"
        aria-hidden="true"
        >›</span
      >
    </NuxtLink>
    <button
      class="setting-row"
      type="button"
      :disabled="installed"
      @click="show"
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5" />
      </svg>
      <span class="copy"
        ><b>{{ installed ? 'Appen er installeret' : 'Installer appen' }}</b
        ><small>{{
          installed ? 'Appen er klar til brug' : 'Få appen på din hjemmeskærm'
        }}</small></span
      ><span
        class="arrow"
        aria-hidden="true"
        >{{ installed ? '✓' : '›' }}</span
      >
    </button>
  </section>
</template>
<style scoped>
.app-settings {
  padding: 18px;
  border-radius: var(--radius);
  background: var(--surface);
  box-shadow: var(--shadow-sm);
}
h2 {
  margin: 0 0 8px;
  font-size: 18px;
}
.setting-row {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 70px;
  padding: 12px 0;
  border: 0;
  background: none;
  color: var(--text);
  text-decoration: none;
  text-align: left;
  font: inherit;
  cursor: pointer;
}
.setting-row + .setting-row {
  border-top: 1px solid var(--hairline);
}
.copy {
  flex: 1;
  min-width: 0;
  display: grid;
  gap: 4px;
}
b {
  font-size: 14px;
}
small {
  font-size: 11px;
  color: var(--muted);
  line-height: 1.4;
}
.arrow {
  font-size: 22px;
  color: var(--muted);
}
svg {
  width: 24px;
  height: 24px;
  flex: none;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.7;
  stroke-linejoin: round;
  stroke-linecap: round;
}
.setting-row:disabled {
  cursor: default;
}
.setting-row:focus-visible {
  outline: 2px solid var(--text);
  outline-offset: 4px;
  border-radius: 8px;
}
</style>
