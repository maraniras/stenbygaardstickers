<script setup lang="ts">
import type { CrosswordAdminProgress } from '../../../shared/types/crossword'

useHead({ title: 'Deltagernes løsninger · Krydsord · Admin' })
const { admin, check } = useAdmin()
const route = useRoute()
const progress = ref<CrosswordAdminProgress | null>(null)
const pending = ref(false)
const error = ref('')
const revision = ref(0)
const selected = computed(() =>
  progress.value?.players.find((player) => player.id === route.query.player),
)
async function load() {
  if (pending.value) return
  pending.value = true
  error.value = ''
  try {
    if (!(await check())) {
      progress.value = null
      return
    }
    progress.value = await $fetch<CrosswordAdminProgress>('/api/admin/crossword/progress')
    revision.value++
  } catch (err: any) {
    progress.value = null
    error.value = err?.data?.statusMessage || 'Kunne ikke hente deltagernes løsninger.'
  } finally {
    pending.value = false
  }
}
onMounted(load)
</script>

<template>
  <div
    v-if="selected && progress && admin"
    class="participant-board"
  >
    <CrosswordBoard
      :key="selected.id + ':' + revision"
      :title="selected.label"
      back-to="/admin/krydsord-deltagere"
      :puzzle="progress.puzzle"
      puzzle-id="1"
      owner="admin-deltager"
      :preview="true"
      :read-only="true"
      read-only-label="Deltager"
      :solution="selected.letters"
      :correct-letters="selected.correctLetters"
    >
      <template #actions>
        <button
          class="refresh"
          :disabled="pending"
          @click="load"
        >
          {{ pending ? 'Henter…' : 'Opdater' }}
        </button>
      </template>
    </CrosswordBoard>
    <p class="legend">
      Grønne felter er rigtige. Viser senest gemte bogstaver ·
      {{ Object.keys(selected.correctLetters).length }} / {{ progress.totalLetters }} rigtige.
    </p>
  </div>
  <div
    v-else
    class="participants"
  >
    <PageHeader
      title="Deltagernes løsninger"
      back-to="/admin/krydsord"
    />
    <p v-if="admin === false">Log ind på <NuxtLink to="/admin">adminsiden</NuxtLink> først.</p>
    <template v-else>
      <p>
        Åbn en deltager for at se deres senest gemte løsning. Grønne felter viser rigtige bogstaver.
        Oversigten ændrer ikke deltagernes hjælp.
      </p>
      <button
        class="btn secondary"
        :disabled="pending"
        @click="load"
      >
        {{ pending ? 'Henter…' : 'Opdater løsninger' }}
      </button>
      <p
        v-if="error"
        role="alert"
      >
        {{ error }}
      </p>
      <template v-if="progress">
        <p v-if="!progress.players.length">Ingen har påbegyndt krydsordet endnu.</p>
        <ul v-else>
          <li
            v-for="player in progress.players"
            :key="player.id"
          >
            <NuxtLink :to="{ path: '/admin/krydsord-deltagere', query: { player: player.id } }">
              <strong>{{ player.label }} <span v-if="player.completed">· Gennemført</span></strong>
              <span
                >{{ Object.keys(player.letters).length }} /
                {{ progress.totalLetters }} udfyldt</span
              >
              <span class="correct"
                >{{ Object.keys(player.correctLetters).length }} rigtige · Se løsning →</span
              >
            </NuxtLink>
          </li>
        </ul>
      </template>
    </template>
  </div>
</template>

<style scoped>
.participant-board {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}
.participant-board :deep(.crossword-page) {
  flex: 1;
  width: 100%;
}
.participants {
  max-width: 620px;
  margin: 0 auto;
  padding: calc(20px + var(--safe-t)) 16px 30px;
}
p {
  color: var(--muted);
  font-size: 13px;
  line-height: 1.6;
}
ul {
  list-style: none;
  padding: 0;
  display: grid;
  gap: 12px;
  margin: 20px 0;
}
li a {
  display: grid;
  gap: 6px;
  padding: 16px;
  border: 1px solid var(--hairline);
  border-radius: 16px;
  background: var(--surface);
  text-decoration: none;
  font-size: 13px;
}
strong {
  color: var(--text);
  font-size: 15px;
}
.correct {
  color: var(--accent);
}
.refresh {
  padding: 8px 10px;
  border: 1px solid var(--hairline);
  border-radius: 12px;
  background: var(--surface-2);
  color: var(--text);
  font: inherit;
  font-size: 12px;
}
.legend {
  padding: 0 16px 16px;
  margin: 0 auto;
  max-width: 1080px;
}
</style>
