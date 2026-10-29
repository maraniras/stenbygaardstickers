<script setup lang="ts">
defineProps<{ basemap: Basemap, hasStickers: boolean, person: string }>()
const emit = defineEmits<{ close: [], overview: [], basemap: [], journey: [] }>()
const dialog = ref<HTMLDialogElement>()

onMounted(() => dialog.value?.showModal())
onBeforeUnmount(() => dialog.value?.close())

function choose(action: 'overview' | 'basemap' | 'journey') {
  if (action === 'overview') emit('overview')
  else if (action === 'basemap') emit('basemap')
  else emit('journey')
  dialog.value?.close()
}
</script>

<template>
  <Teleport to="body">
    <dialog ref="dialog" class="tools-sheet" aria-labelledby="map-tools-title" @close="emit('close')" @click="($event.target === dialog) && dialog?.close()">
      <div class="panel">
        <span class="handle" aria-hidden="true" />
        <header>
          <h2 id="map-tools-title">Kortvalg</h2>
          <button class="close" aria-label="Luk kortvalg" autofocus @click="dialog?.close()">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
          </button>
        </header>
        <button class="option" @click="choose('overview')">
          <span class="icon"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18" /></svg></span>
          <span><b>Vis alle stickers</b><small>{{ person ? `Hele kortet for ${person}` : 'Zoom ud til hele samlingen' }}</small></span>
        </button>
        <button class="option" @click="choose('basemap')">
          <span class="icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 13 9 5 9-5" /></svg></span>
          <span><b>{{ basemap === 'kort' ? 'Vis luftfoto' : 'Vis almindeligt kort' }}</b><small>{{ basemap === 'kort' ? 'Se stederne fra oven' : 'Tilbage til veje og stednavne' }}</small></span>
        </button>
        <button class="option" :disabled="!hasStickers" @click="choose('journey')">
          <span class="icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 11 7-11 7V5Z" /></svg></span>
          <span><b>{{ person ? `Se ${genitive(person)} rejse` : 'Se rejsen' }}</b><small>Følg Emil fra sticker til sticker</small></span>
        </button>
      </div>
    </dialog>
  </Teleport>
</template>

<style scoped>
.tools-sheet {
  position: fixed;
  inset: auto 0 0;
  width: 100%;
  max-width: 520px;
  max-height: calc(100dvh - var(--safe-t) - 24px);
  margin: 0 auto;
  padding: 0;
  border: 0;
  border-radius: 28px 28px 0 0;
  background: var(--surface);
  color: var(--text);
  overflow-y: auto;
  box-shadow: var(--shadow);
}
.tools-sheet::backdrop { background: rgba(17, 17, 20, .3); }
.panel { padding: 10px 16px calc(20px + var(--safe-b)); }
.handle { display: block; width: 36px; height: 4px; margin: 0 auto 10px; border-radius: 999px; background: var(--surface-2); }
header { display: flex; justify-content: space-between; align-items: center; margin: 0 0 10px 8px; }
h2 { font-size: 21px; }
.close { display: grid; place-items: center; width: 44px; height: 44px; padding: 0; border: 0; border-radius: 50%; background: var(--surface-2); cursor: pointer; }
.option { display: flex; align-items: center; gap: 14px; width: 100%; min-height: 76px; padding: 12px 8px; border: 0; border-radius: 16px; background: none; text-align: left; cursor: pointer; }
.option:hover, .option:active { background: var(--surface-2); }
.option:disabled { opacity: .45; cursor: default; }
.icon { display: grid; place-items: center; flex: none; width: 44px; height: 44px; border-radius: 14px; background: var(--accent-soft); }
.option b { display: block; font-size: 16px; }
.option small { display: block; margin-top: 2px; font-size: 13px; color: var(--muted); }
svg { width: 22px; height: 22px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
button:focus-visible { outline: 3px solid var(--text); outline-offset: 2px; }
@media (min-width: 600px) { .tools-sheet { bottom: 24px; border-radius: 28px; } }
</style>
