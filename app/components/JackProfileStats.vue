<script setup lang="ts">
import type { JackStatsPublic } from '../../shared/types/jackStats'
defineProps<{ stats: JackStatsPublic }>()
</script>
<template>
  <CasinoProfileStats
    title="Bananjack"
    image="/badges/custom/jack-rounds.webp"
    :summary="`${stats.rounds.toLocaleString('da-DK')} ${stats.rounds === 1 ? 'runde' : 'runder'} · ${stats.wins.toLocaleString('da-DK')} vundne hænder`"
    :rows="[
      { label: 'Runder', value: stats.rounds },
      { label: 'Vundne hænder', value: stats.wins },
      { label: 'Naturlige Bananjacks', value: stats.naturals },
      { label: 'Sejre efter fordobling', value: stats.doubleWins },
      { label: 'Bedste Bananjack-stime', value: stats.bestNaturalStreak },
      { label: 'Netto fra spillet', value: stats.net, bananas: true },
    ]"
    note="Netto er gevinster minus indsatser, uden badgebonuser. Optællingen starter med denne opdatering og din senest gemte runde."
  />
</template>
