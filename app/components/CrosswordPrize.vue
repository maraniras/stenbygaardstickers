<script setup lang="ts">
import { CROSSWORD_PHYSICAL_PRIZE } from '../../shared/utils/crossword'
</script>
<template>
  <div class="crossword-prize">
    <img
      :src="CROSSWORD_PHYSICAL_PRIZE.image"
      alt="Hvid RTA-kop med sort hank og inderside"
    /><span>RTA-kop + 1.000 bananer + vinderbadge</span>
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
