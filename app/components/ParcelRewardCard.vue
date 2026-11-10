<script setup lang="ts">
import type { ParcelReward } from '../../shared/types/parcel-game'
import { parcelRewardIcon, isParcelPhysical } from '../../shared/utils/parcel-rewards'
defineProps<{ reward: ParcelReward; large?: boolean }>()
</script>
<template>
  <div
    class="reward-card"
    :class="{ large }"
  >
    <img
      :src="parcelRewardIcon(reward)"
      :alt="reward.title"
    /><b>{{ reward.title }}</b
    ><strong v-if="reward.amount">{{ reward.amount }} 🍌</strong
    ><small v-if="isParcelPhysical(reward)">+ fysisk præmie</small
    ><small v-else-if="reward.kind === 'frame'">Eksklusiv profilramme</small>
  </div>
</template>
<style scoped>
.reward-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  width: 104px;
  padding: 8px 3px;
  gap: 4px;
}
.reward-card img {
  width: 78px;
  height: 78px;
  object-fit: contain;
  filter: drop-shadow(0 5px 8px #0002);
}
.reward-card b {
  font-size: 11px;
  line-height: 1.4;
}
.reward-card strong {
  font-size: 12px;
  color: light-dark(#287343, #95d7ac);
}
.reward-card small {
  font-size: 9px;
  line-height: 1.4;
  color: var(--muted);
}
.reward-card.large {
  width: 100%;
  padding: 6px 0 20px;
}
.large img {
  width: 190px;
  height: 190px;
}
.large b {
  font-size: 24px;
}
.large strong {
  font-size: 27px;
}
.large small {
  font-size: 13px;
}
</style>
