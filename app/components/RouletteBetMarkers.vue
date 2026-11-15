<script setup lang="ts">
const props = defineProps<{ people: { name: string; amount: number }[] }>()
const visible = computed(() => props.people.slice(0, 4))
const extra = computed(() => Math.max(0, props.people.length - 4))
</script>
<template>
  <span
    v-if="people.length"
    class="bet-markers"
    :class="{ crowded: people.length > 2 }"
    aria-hidden="true"
  >
    <span
      v-for="(person, index) in visible"
      :key="person.name"
      class="bettor"
      :class="`corner-${index}`"
      :title="`${person.name}: ${person.amount} bananer`"
    >
      <UserAvatar
        class="marker-avatar"
        :name="person.name"
      />
      <span class="marker-amount">{{ person.amount }}</span>
      <span
        v-if="index === 3 && extra"
        class="marker-extra"
        >+{{ extra }}</span
      >
    </span>
  </span>
</template>
<style scoped>
.bet-markers {
  position: absolute;
  inset: 2px;
  pointer-events: none;
  z-index: 2;
}
.bettor {
  position: absolute;
  display: flex;
  align-items: center;
  gap: 2px;
  line-height: 1;
}
.corner-0 {
  top: 0;
  left: 0;
}
.corner-1 {
  top: 0;
  right: 0;
  flex-direction: row-reverse;
}
.corner-2 {
  bottom: 0;
  left: 0;
}
.corner-3 {
  bottom: 0;
  right: 0;
  flex-direction: row-reverse;
}
.marker-avatar {
  display: grid;
  place-items: center;
  width: 18px;
  height: 18px;
  border: 1px solid #f3d78b;
  border-radius: 50%;
  background: #f0ce7c;
  color: #302611;
  font-size: 10px;
  font-weight: 800;
}
.marker-amount {
  padding: 2px 3px;
  border-radius: 4px;
  background: #10241fe6;
  color: #fff4d3;
  font-size: 10px;
  font-weight: 750;
}
.crowded .marker-amount {
  display: none;
}
.marker-extra {
  position: absolute;
  right: -2px;
  bottom: -3px;
  padding: 1px 2px;
  border: 1px solid #e0c780;
  border-radius: 4px;
  background: #19372d;
  color: #fff4d3;
  font-size: 8px;
  font-weight: 750;
}
@container (max-width: 105px) {
  .marker-avatar {
    width: 15px;
    height: 15px;
    font-size: 8px;
  }
  .marker-amount {
    font-size: 8px;
    padding: 2px;
  }
  .bet-markers:not(.crowded) .corner-1 .marker-amount {
    display: none;
  }
  .bet-markers:has(.corner-1) .corner-0 .marker-amount {
    display: none;
  }
}
</style>
