<script setup lang="ts">
import type { CasinoDailyLimit } from '../../shared/types/casino'
defineProps<{ limit?: CasinoDailyLimit | null }>()
</script>
<template>
  <div
    v-if="limit"
    class="casino-limit"
    role="status"
  >
    <div class="limit-heading">
      <b>Casino i dag</b>
      <span
        v-if="limit.netLoss < 0"
        class="profit"
        >Overskud +{{ (-limit.netLoss).toLocaleString('da-DK') }} 🍌</span
      >
      <span v-else
        >Nettotab {{ limit.netLoss.toLocaleString('da-DK') }} / {{ limit.amount }} 🍌</span
      >
    </div>
    <span
      >{{ limit.remaining.toLocaleString('da-DK') }} 🍌 til nye indsatser · fælles tabsgrænse
      {{ limit.amount }} 🍌</span
    >
    <small v-if="limit.reserved"
      >{{ limit.reserved.toLocaleString('da-DK') }} 🍌 reserveret i din aktive hånd</small
    >
  </div>
</template>
<style scoped>
.casino-limit {
  display: grid;
  gap: 4px;
  padding: 10px 12px;
  border: 1px solid var(--hairline);
  border-radius: 14px;
  background: var(--surface);
  font-size: 11px;
  color: var(--muted);
}
.limit-heading {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 5px;
}
.limit-heading b {
  color: var(--text);
}
.profit {
  color: light-dark(#287343, #95d7ac);
}
small {
  font-size: 10px;
}
</style>
