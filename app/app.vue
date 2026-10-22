<script setup lang="ts">
const { unlocked } = useUnlock()
</script>

<template>
  <LockScreen v-if="!unlocked" />
  <div v-else class="shell">
    <main class="content">
      <NuxtPage />
    </main>
    <BottomNav />
  </div>
</template>

<style scoped>
.shell {
  height: 100%;
  display: flex;
  flex-direction: column;
}
.content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
</style>
