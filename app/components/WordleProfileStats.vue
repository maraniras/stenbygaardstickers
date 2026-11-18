<script setup lang="ts">
import type { WordleStats } from '../../shared/types/wordle'
const props = defineProps<{ stats: WordleStats }>()
const largest = computed(() => Math.max(1, ...props.stats.distribution))
</script>
<template>
  <CasinoProfileStats
    v-if="stats.played > 0"
    title="Wordle"
    image="/badges/custom/wordle-wins.webp"
    :summary="`${stats.wins} løst · ${stats.played} spil`"
    :rows="[
      { label: 'Spillede spil', value: stats.played },
      { label: 'Løste spil', value: stats.wins },
      { label: 'Sejrsprocent (%)', value: Math.round((stats.wins / stats.played) * 1000) / 10 },
      {
        label: 'Forsøg pr. løsning',
        value: stats.wins ? Math.round((stats.winningGuesses / stats.wins) * 100) / 100 : 0,
      },
      { label: 'Nuværende sejrsstime', value: stats.streak },
      { label: 'Længste sejrsstime', value: stats.bestStreak },
      { label: 'Bananer fra spillet', value: stats.bananas, bananas: true },
    ]"
    note="Kun afsluttede spil tæller i sejrsprocenten. Stimen følger spildøgnet kl. 04; et tabt eller oversprunget døgn bryder den. Bananer er spilgevinster uden badgebonusser."
  >
    <div class="distribution">
      <h3>Forsøg ved en løsning</h3>
      <ol>
        <li
          v-for="(count, index) in stats.distribution"
          :key="index"
          :aria-label="`${index + 1} forsøg: ${count} løsninger`"
        >
          <span class="attempt">{{ index + 1 }}</span>
          <div class="track">
            <span
              class="bar"
              :class="{ empty: !count }"
              :style="{ width: `${Math.max(8, (count / largest) * 100)}%` }"
              >{{ count }}</span
            >
          </div>
        </li>
      </ol>
    </div>
  </CasinoProfileStats>
</template>
<style scoped>
.distribution {
  padding: 0 14px 8px;
}
h3 {
  font-size: 12px;
  color: var(--muted);
  margin: 8px 0 12px;
}
ol {
  list-style: none;
  padding: 0;
  display: grid;
  gap: 6px;
}
li {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}
.attempt {
  width: 12px;
  font-weight: 750;
}
.track {
  flex: 1;
  min-width: 0;
}
.bar {
  display: block;
  box-sizing: border-box;
  min-width: 24px;
  padding: 4px 7px;
  border-radius: 5px;
  background: #387b57;
  color: white;
  text-align: right;
  font-weight: 750;
}
.bar.empty {
  background: var(--surface-2);
  color: var(--muted);
}
</style>
