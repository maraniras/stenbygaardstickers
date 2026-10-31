<script setup lang="ts">
const props = defineProps<{ kind: 'city' | 'wheel' }>()
const emit = defineEmits<{ close: [] }>()
const dialog = ref<HTMLDialogElement>()
const city = computed(() => props.kind === 'city')
onMounted(() => dialog.value?.showModal())
onBeforeUnmount(() => dialog.value?.close())
</script>

<template>
  <Teleport to="body">
    <dialog
      ref="dialog"
      class="game-sheet"
      aria-labelledby="daily-game-title"
      @close="emit('close')"
      @click="$event.target === dialog && dialog?.close()"
    >
      <button
        class="close"
        aria-label="Luk spilbeskrivelse"
        autofocus
        @click="dialog?.close()"
      >
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="m6 6 12 12M18 6 6 18" />
        </svg>
      </button>
      <DailyGameArt :kind="kind" />
      <div class="body">
        <span class="coming">Kommer snart</span>
        <h2 id="daily-game-title">{{ city ? 'Emil er faret vild' : 'Dagens lykkehjul' }}</h2>
        <p class="intro">
          {{
            city
              ? 'En ny hovedstad. Et luftfoto. En Emil, der ikke aner, hvor han er.'
              : 'Én omgang. Lidt held. Måske en håndfuld bananer.'
          }}
        </p>
        <ol v-if="city">
          <li>Se luftfotoet, og vælg mellem seks byer.</li>
          <li>Du har fem gæt. Et forkert gæt zoomer billedet længere ud.</li>
          <li>Gæt rigtigt med færrest mulige forsøg, og vind flere bananer.</li>
        </ol>
        <ol v-else>
          <li>Få ét gratis spin hver dag.</li>
          <li>Land på bananer eller en nitte. Der er også en sjælden jackpot.</li>
          <li>Kom igen flere dage i træk, og byg en streak.</li>
        </ol>
        <div class="reset">
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              cx="12"
              cy="12"
              r="9"
            />
            <path d="M12 7v5l3 2" /></svg
          >Nyt spil hver dag kl. 04.00 dansk tid
        </div>
        <p class="preview-note">
          Det her er et smugkig. Du kan spille og optjene bananer, når spillene åbner.
        </p>
        <button
          class="btn"
          @click="dialog?.close()"
        >
          Tilbage til dagens spil
        </button>
      </div>
    </dialog>
  </Teleport>
</template>

<style scoped>
.game-sheet {
  position: fixed;
  inset: auto 0 0;
  width: 100%;
  max-width: 480px;
  max-height: calc(100dvh - var(--safe-t) - 20px);
  margin: 0 auto;
  padding: 0;
  overflow-y: auto;
  border: 0;
  border-radius: 28px 28px 0 0;
  background: var(--surface);
  color: var(--text);
  box-shadow: var(--shadow);
}
.game-sheet::backdrop {
  background: rgba(10, 10, 20, 0.55);
  backdrop-filter: blur(4px);
}
.close {
  position: absolute;
  right: 12px;
  top: 12px;
  z-index: 5;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border: 0;
  border-radius: 50%;
  background: var(--surface);
  color: var(--text);
  box-shadow: var(--shadow-sm);
  cursor: pointer;
}
svg {
  width: 20px;
  height: 20px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
}
.body {
  padding: 22px 22px calc(24px + var(--safe-b));
}
.coming {
  display: inline-flex;
  padding: 4px 9px;
  border-radius: 7px;
  background: var(--surface-2);
  color: var(--muted);
  font-size: 11px;
  font-weight: 700;
}
h2 {
  margin: 12px 0 0;
  font-size: 27px;
}
.intro {
  color: var(--muted);
  margin: 10px 0 20px;
  font-size: 14px;
}
ol {
  display: flex;
  flex-direction: column;
  gap: 13px;
  margin: 0 0 22px;
  padding-left: 22px;
  font-size: 14px;
}
li {
  padding-left: 5px;
}
li::marker {
  color: var(--muted);
  font-weight: 800;
}
.reset {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  border-radius: 12px;
  background: var(--surface-2);
  font-size: 12px;
  font-weight: 600;
}
.reset svg {
  flex: none;
  width: 18px;
  height: 18px;
}
.preview-note {
  margin: 16px 0;
  color: var(--muted);
  font-size: 12px;
}
.btn {
  width: 100%;
}
button:focus-visible {
  outline: 3px solid var(--text);
  outline-offset: 3px;
}
@media (min-width: 600px) {
  .game-sheet {
    inset: 50% 0 auto;
    max-height: calc(100dvh - 48px);
    border-radius: 28px;
    transform: translateY(-50%);
  }
}
</style>
