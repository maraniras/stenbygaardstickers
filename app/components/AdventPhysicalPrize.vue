<script setup lang="ts">
import type { AdventPhysicalWinner } from '../../shared/types/advent'
import { adventPrizeIcon } from '../../shared/utils/advent-rewards'
defineProps<{ entry: AdventPhysicalWinner; saving: string }>()
const emit = defineEmits<{ toggle: [entry: AdventPhysicalWinner] }>()
const names: Record<string, string> = {
  'mix-max': 'Mix Max',
  'red-wine': 'Rødvin',
  'white-wine': 'Hvidvin',
  'cycling-bottle': 'Cykeldrikkedunk',
}
</script>
<template>
  <article>
    <img
      :src="adventPrizeIcon(entry.prize)"
      alt=""
    />
    <div>
      <b>{{ names[entry.prize.reward ?? ''] || entry.prize.title }}</b>
      <NuxtLink :to="`/person/${encodeURIComponent(entry.winner)}`">{{ entry.winner }}</NuxtLink>
      <small
        >Låge {{ entry.day
        }}<template v-if="entry.openedAt">
          · Åbnet {{ formatDate(entry.openedAt.slice(0, 10)) }}</template
        ></small
      >
      <span
        class="prize-status"
        :class="{ found: entry.openedAt }"
        >{{
          entry.deliveredAt
            ? `Udleveret ${formatDate(entry.deliveredAt.slice(0, 10))}`
            : entry.openedAt
              ? 'Fundet · afventer udlevering'
              : 'Lågen er ikke åbnet endnu'
        }}</span
      >
      <button
        v-if="entry.openedAt"
        type="button"
        :disabled="!!saving"
        @click="emit('toggle', entry)"
      >
        {{
          saving === entry.id
            ? 'Gemmer…'
            : entry.deliveredAt
              ? 'Ret til afventer'
              : 'Markér som udleveret'
        }}
      </button>
    </div>
  </article>
</template>
<style scoped>
article {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  margin-bottom: 10px;
  border: 1px solid var(--hairline);
  border-radius: 12px;
  background: var(--surface);
  font-size: 13px;
}
img {
  width: 70px;
  height: 70px;
  object-fit: contain;
  flex-shrink: 0;
}
article > div {
  min-width: 0;
  display: grid;
  gap: 5px;
}
a {
  color: var(--title);
  font-weight: 700;
  overflow-wrap: anywhere;
}
small,
.prize-status {
  color: var(--muted);
  font-size: 11px;
}
.prize-status.found {
  color: var(--title);
  font-weight: 700;
}
button {
  justify-self: start;
  min-height: 40px;
  padding: 8px 12px;
  border: 1px solid var(--hairline);
  border-radius: 10px;
  background: var(--surface-2);
  color: var(--text);
  font: inherit;
  font-size: 12px;
}
button:disabled {
  opacity: 0.6;
}
</style>
