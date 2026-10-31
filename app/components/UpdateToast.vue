<script setup lang="ts">
// Vises, når der er en ny version, men appen ikke selv genindlæser (plugins/update.client.ts)
const available = useState('update-available', () => false)
const reload = () => window.location.reload()
</script>

<template>
  <Transition name="pop">
    <div
      v-if="available"
      class="update glass"
      role="status"
    >
      <span>✨ Ny version klar</span>
      <button
        class="btn"
        @click="reload"
      >
        Opdater
      </button>
    </div>
  </Transition>
</template>

<style scoped>
.update {
  position: fixed;
  top: calc(12px + var(--safe-t));
  left: 50%;
  z-index: 1150;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 8px 8px 16px;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 700;
  white-space: nowrap;
  transform: translateX(-50%);
}
.update .btn {
  min-height: 36px;
  padding: 0 16px;
  font-size: 14px;
  border-radius: 999px;
}
.pop-enter-active,
.pop-leave-active {
  transition:
    transform 0.3s cubic-bezier(0.2, 0.9, 0.3, 1),
    opacity 0.25s;
}
.pop-enter-from,
.pop-leave-to {
  transform: translate(-50%, -20px);
  opacity: 0;
}
</style>
