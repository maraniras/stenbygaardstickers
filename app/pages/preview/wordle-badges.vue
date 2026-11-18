<script setup lang="ts">
import { emptyDailyStats } from '../../../shared/utils/economy'
import { emptyWordleStats } from '../../../shared/utils/wordle-badges'
if (!import.meta.dev) throw createError({ statusCode: 404, statusMessage: 'Siden findes ikke' })
useHead({ title: 'Wordle-badges · Forhåndsvisning' })
// Keep genuine unread badges untouched while inspecting this fixture page.
const sheetOpen = useState('badge-sheet-open', () => false)
const previousSheetState = sheetOpen.value
sheetOpen.value = true
onBeforeUnmount(() => {
  sheetOpen.value = previousSheetState
})
const stats = {
  ...emptyWordleStats(),
  played: 60,
  wins: 50,
  firstWins: 1,
  lastWins: 7,
  quickWins: 19,
  streak: 7,
  bestStreak: 30,
  winningGuesses: 197,
  distribution: [1, 6, 12, 14, 10, 7],
  bananas: 1200,
}
// In-memory fixture only: no user, wallet, claims or notifications are changed.
const badges = badgesFor(
  'Preview',
  [],
  {},
  {
    economy: {
      preview: {
        balance: 0,
        peakBalance: 0,
        stats: emptyDailyStats(),
        milestones: {},
        wordle: stats,
      },
    },
  },
).filter((b) => b.id.startsWith('wordle-'))
const selected = ref<string>()
const opened = computed(() => badges.find((b) => b.id === selected.value))
</script>
<template>
  <div class="wordle-preview">
    <PageHeader
      title="Wordle-badges"
      back-to="/spil/wordle"
      description="Forhåndsvisning med eksempelstatistik"
    />
    <div class="medals">
      <BadgeMedal
        v-for="badge in badges"
        :key="badge.id"
        :badge="badge"
        @click="selected = badge.id"
      />
    </div>
    <WordleProfileStats :stats="stats" />
    <BadgeSheet
      v-if="opened"
      :badge="opened"
      person="Preview"
      @close="selected = undefined"
    />
  </div>
</template>
<style scoped>
.wordle-preview {
  max-width: 600px;
  margin: 0 auto;
  padding: calc(20px + var(--safe-t)) 16px 24px;
}
.medals {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}
</style>
