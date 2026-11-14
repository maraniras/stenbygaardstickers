<script setup lang="ts">
import type { SlotStats } from '../../shared/types/slots'
defineProps<{ stats: SlotStats }>()
</script>
<template>
  <CasinoProfileStats
    title="Bananditten"
    image="/badges/custom/slot-spins.webp"
    :summary="`${stats.spins.toLocaleString('da-DK')} spins · ${stats.wins.toLocaleString('da-DK')} med overskud`"
    :rows="[
      { label: 'Spins', value: stats.spins },
      { label: 'Spins med overskud', value: stats.wins },
      { label: 'Store gevinster (mindst 10×)', value: stats.bigWins },
      { label: 'Jackpots (100×)', value: stats.jackpots },
      { label: 'Bedste gevinststime', value: stats.bestProfitStreak },
      { label: 'Netto fra spillet', value: stats.net, bananas: true },
    ]"
    note="Netto er gevinster minus indsatser, uden badgebonuser. Et spin med overskud giver mere tilbage end indsatsen."
  />
</template>
