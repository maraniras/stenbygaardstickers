<script setup lang="ts">
defineProps<{ label: string; centered?: boolean }>()
const emit = defineEmits<{ close: [] }>()
const dialog = ref<HTMLDialogElement>()
onMounted(() => dialog.value?.showModal())
onBeforeUnmount(() => dialog.value?.close())
</script>

<template>
  <Teleport to="body">
    <dialog
      ref="dialog"
      :class="['app-dialog', { centered }]"
      :aria-label="label"
      @cancel.prevent="emit('close')"
      @close="emit('close')"
      @click="$event.target === dialog && emit('close')"
    >
      <slot />
    </dialog>
  </Teleport>
</template>

<style scoped>
.app-dialog {
  position: fixed;
  inset: 0;
  width: min(100%, 520px);
  max-width: 100%;
  max-height: calc(100dvh - 20px);
  padding: 0;
  margin: auto auto 0;
  border: 0;
  border-radius: 26px 26px 0 0;
  background: var(--surface);
  color: var(--text);
  overflow: auto;
  overscroll-behavior: contain;
}
.app-dialog::backdrop {
  background: #0009;
  backdrop-filter: blur(5px);
}
.centered {
  width: min(340px, calc(100% - 32px));
  margin: auto;
  border-radius: 28px;
}
.app-dialog[open] {
  animation: dialog-in 0.18s ease-out;
}
@keyframes dialog-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@media (prefers-reduced-motion: reduce) {
  .app-dialog[open] {
    animation: none;
  }
}
</style>
