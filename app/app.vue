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
  position: relative;
  height: 100%;
}
.content {
  height: 100%;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
</style>
