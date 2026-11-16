<script setup lang="ts">
import type { RouletteStats } from '../../shared/types/roulette'
defineProps<{ stats: RouletteStats }>()
</script>
<template>
  <CasinoProfileStats
    v-if="stats.rounds > 0"
    title="Roulette"
    image="/badges/custom/roulette-rounds.webp"
    :summary="`${stats.rounds.toLocaleString('da-DK')} runder · ${stats.wins.toLocaleString('da-DK')} med overskud`"
    :rows="[
      { label: 'Runder', value: stats.rounds },
      { label: 'Runder med overskud', value: stats.wins },
      { label: 'Ramt et enkelt tal', value: stats.straightWins },
      { label: 'Samlet indsat', value: stats.totalStaked },
      { label: 'Samlet udbetalt', value: stats.totalPaid },
      { label: 'Største nettogevinst', value: stats.biggestWin, bananas: true },
      { label: 'Netto fra spillet', value: stats.net, bananas: true },
    ]"
    note="Indsatser og udbetalinger er i bananer. Netto er udbetalt minus indsat; største gevinst er overskuddet på én runde."
  />
</template>
