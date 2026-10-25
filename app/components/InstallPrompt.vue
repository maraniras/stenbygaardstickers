<script setup lang="ts">
// Boks der foreslår at få appen på hjemmeskærmen. Vises af sig selv én gang for dem,
// der ikke allerede har den (iPhone i Safari, eller Android når Chrome tilbyder det),
// og ellers fra linket "Installer appen" nederst på listen.
const ASKED = 'stenbygaard-install-asked'
const { open, canPrompt, install } = useInstall()

function asked() {
  try { return Boolean(localStorage.getItem(ASKED)) }
  catch { return false }
}

function close() {
  open.value = null
  try { localStorage.setItem(ASKED, new Date().toISOString()) }
  catch {}
}

onMounted(() => {
  if (isStandalone() || asked()) return
  if (needsHomeScreen()) {
    setTimeout(() => { if (!open.value) open.value = 'ios' }, 1200)
    return
  }
  // Chrome sender beforeinstallprompt kort efter indlæsning, hvis appen kan installeres
  const stop = watch(canPrompt, (can) => {
    if (can && !open.value) open.value = 'prompt'
  }, { immediate: true })
  setTimeout(stop, 15000)
})

async function yes() {
  await install()
  close()
}
</script>

<template>
  <Transition name="pop">
    <div v-if="open" class="install glass" role="dialog" aria-live="polite">
      <div class="head">
        <img src="/icons/icon-192.png" alt="" class="icon">
        <div>
          <b>Få Stenbygaard Stickers som app</b>
          <p v-if="open === 'prompt'">Læg appen på hjemmeskærmen, så den åbner som en rigtig app – og kan sende besked, når Emil lander et nyt sted.</p>
          <p v-else-if="open === 'ios'">Tryk på <span class="key">Del <svg viewBox="0 0 24 24"><path d="M12 15V3m0 0L7.5 7.5M12 3l4.5 4.5" /><path d="M7 10H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-1" /></svg></span> nederst i Safari, vælg <b class="key">Føj til hjemmeskærm</b>, og åbn appen derfra.</p>
          <p v-else>Åbn browserens menu <span class="key">⋮</span> og vælg <b class="key">Installer app</b> eller <b class="key">Føj til startskærm</b>.</p>
        </div>
      </div>
      <div class="actions">
        <template v-if="open === 'prompt'">
          <button class="btn secondary" @click="close">Ikke nu</button>
          <button class="btn" @click="yes">Installer</button>
        </template>
        <button v-else class="btn" @click="close">OK</button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.install {
  position: fixed;
  left: 12px;
  right: 12px;
  bottom: var(--nav-space);
  z-index: 1100;
  max-width: 480px;
  margin: 0 auto;
  padding: 16px;
  border-radius: var(--radius);
}
.head { display: flex; gap: 12px; align-items: flex-start; }
.icon { flex: none; width: 48px; height: 48px; border-radius: 12px; box-shadow: var(--shadow-sm); }
.head > div > b { display: block; font-size: 16px; line-height: 1.3; }
.head p { margin: 4px 0 0; font-size: 14px; color: var(--muted); line-height: 1.45; }
.key {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  color: var(--text);
  font-weight: 700;
}
.key svg { width: 15px; height: 15px; fill: none; stroke: currentColor; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; }
.actions { display: flex; gap: 8px; margin-top: 14px; }
.actions .btn { flex: 1; min-height: 44px; font-size: 15px; }
.pop-enter-active, .pop-leave-active { transition: transform .3s cubic-bezier(.2, .9, .3, 1), opacity .25s; }
.pop-enter-from, .pop-leave-to { transform: translateY(30px); opacity: 0; }
</style>
