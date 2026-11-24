<script setup lang="ts">
const props = defineProps<{ badge: Badge }>()
const emit = defineEmits<{ close: [] }>()
const broken = ref(false)
const icon = computed(() => badgeZoomIcon(props.badge.id))
watch(icon, () => {
  broken.value = false
})
</script>

<template>
  <AppDialog
    :label="`${badge.name} i fuld størrelse`"
    fullscreen
    @close="emit('close')"
  >
    <section class="badge-zoom">
      <header>
        <h2>{{ badge.name }}</h2>
        <button
          type="button"
          aria-label="Luk zoom og gå tilbage til badgen"
          @click="emit('close')"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path d="m6 6 12 12M18 6 6 18" />
          </svg>
        </button>
      </header>
      <div class="artwork">
        <img
          v-if="icon && !broken"
          :src="icon"
          :alt="badge.name"
          draggable="false"
          @error="broken = true"
        />
        <CountryFlag
          v-else-if="badge.flag"
          :code="badge.flag"
        />
        <span
          v-else
          class="emoji"
          aria-hidden="true"
          >{{ badge.emoji }}</span
        >
      </div>
      <p>Tryk på krydset for at vende tilbage til badgen.</p>
    </section>
  </AppDialog>
</template>

<style scoped>
.badge-zoom {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: max(16px, env(safe-area-inset-top)) max(18px, env(safe-area-inset-right))
    max(16px, env(safe-area-inset-bottom)) max(18px, env(safe-area-inset-left));
}
header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex: none;
  gap: 16px;
}
h2 {
  margin: 0;
  font-size: 20px;
  line-height: 1.25;
  overflow-wrap: anywhere;
}
button {
  display: grid;
  place-items: center;
  flex: none;
  width: 48px;
  height: 48px;
  padding: 12px;
  border: 1px solid var(--hairline);
  border-radius: 50%;
  background: var(--surface-2);
  color: var(--text);
  cursor: pointer;
}
button svg {
  width: 24px;
  height: 24px;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
}
button:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
}
.artwork {
  position: relative;
  display: grid;
  place-items: center;
  flex: 1;
  min-height: 0;
  margin: 18px 0;
}
.artwork img,
.artwork :deep(img) {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  user-select: none;
}
.artwork .emoji {
  font-size: min(60vw, 60dvh);
  line-height: 1;
}
p {
  flex: none;
  margin: 0;
  color: var(--muted);
  font-size: 12px;
  text-align: center;
}
</style>
