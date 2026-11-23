<script setup lang="ts">
import { CHANGELOG } from '../utils/changelog'
const version = ref<{ id?: string } | null>(null)
onMounted(async () => {
  version.value = await $fetch('/api/version').catch(() => null)
})
</script>
<template>
  <section class="system-version">
    <h2>Version og drift</h2>
    <p>Seneste udgivelse: {{ CHANGELOG.find((item) => item.date)?.version }}</p>
    <p v-if="version?.id">Build: {{ version.id }}</p>
    <NuxtLink to="/nyheder">Se versionshistorik →</NuxtLink>
  </section>
</template>
<style scoped>
.system-version {
  padding: 22px;
  border: 1px solid var(--hairline);
  border-radius: 22px;
  background: var(--surface);
}
h2 {
  font-size: 20px;
}
p {
  color: var(--muted);
  overflow-wrap: anywhere;
}
a {
  color: var(--text);
}
</style>
