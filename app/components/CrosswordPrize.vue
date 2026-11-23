<script setup lang="ts">
import { CROSSWORD_PHYSICAL_PRIZE } from '../../shared/utils/crossword'
defineProps<{ puzzleId?: string }>()
</script>
<template>
  <div class="crossword-prize">
    <img
      :src="
        puzzleId === 'marvel'
          ? '/badges/custom/crossword-marvel-winner.webp'
          : CROSSWORD_PHYSICAL_PRIZE.image
      "
      :alt="puzzleId === 'marvel' ? 'Marvel-vinderbadge' : 'RTA-kop'"
    /><span>{{
      puzzleId === 'marvel'
        ? '500 bananer + vinderbadge + profilramme og banner · Øvrige løsninger: 50 bananer'
        : 'RTA-kop + 1.000 bananer + vinderbadge + profilramme og banner'
    }}</span>
  </div>
</template>
<style scoped>
.crossword-prize {
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: 11px;
  font-weight: 700;
  line-height: 1.4;
}
img {
  width: 44px;
  height: 44px;
  flex: none;
  object-fit: contain;
}
</style>
