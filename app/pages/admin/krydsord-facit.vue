<script setup lang="ts">
import type { CrosswordAnswerKey } from '../../../shared/types/crossword'
useHead({ title: 'Facit · Krydsord #1 · Admin' })
const { admin, check } = useAdmin()
const answerKey = ref<CrosswordAnswerKey | null>(null)
const error = ref('')
const pending = ref(true)
async function load() {
  pending.value = true
  error.value = ''
  try {
    if (!(await check())) return
    answerKey.value = await $fetch<CrosswordAnswerKey>('/api/admin/crossword/solution')
  } catch (err: any) {
    error.value = err?.data?.statusMessage || 'Kunne ikke hente facit.'
  } finally {
    pending.value = false
  }
}
onMounted(load)
</script>
<template>
  <CrosswordBoard
    v-if="answerKey && admin"
    :key="answerKey.puzzle.revision"
    title="Facit · Krydsord #1"
    back-to="/admin/krydsord"
    :puzzle="answerKey.puzzle"
    puzzle-id="1"
    owner="admin-facit"
    :preview="true"
    :read-only="true"
    :solution="answerKey.solution"
  />
  <div
    v-else
    class="answer-key-status"
  >
    <PageHeader
      title="Facit · Krydsord #1"
      back-to="/admin/krydsord"
    />
    <p
      v-if="pending"
      role="status"
    >
      Henter facit…
    </p>
    <p v-else-if="admin === false">Log ind på <NuxtLink to="/admin">adminsiden</NuxtLink> først.</p>
    <template v-else-if="error">
      <p role="alert">{{ error }}</p>
      <button
        type="button"
        class="btn"
        @click="load"
      >
        Prøv igen
      </button>
    </template>
  </div>
</template>
<style scoped>
.answer-key-status {
  max-width: 560px;
  margin: 0 auto;
  padding: calc(20px + var(--safe-t)) 16px 30px;
}
.answer-key-status p {
  color: var(--muted);
  font-size: 14px;
  line-height: 1.6;
}
</style>
