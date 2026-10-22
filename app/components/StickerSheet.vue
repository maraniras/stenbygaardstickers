<script setup lang="ts">
const props = defineProps<{ sticker: Sticker }>()
defineEmits<{ close: [] }>()
const thumb = computed(() => thumbnail(props.sticker))
</script>

<template>
  <NuxtLink class="sheet" :to="`/sticker/${sticker.id}`">
    <div class="thumb" :class="{ none: !thumb }">
      <img v-if="thumb" :src="thumb" alt="">
      <img v-else src="/marker.png" alt="" class="fallback">
      <span v-if="sticker.media.length > 1" class="count">+{{ sticker.media.length - 1 }}</span>
    </div>
    <div class="info">
      <div class="place"><CountryFlag :code="sticker.countryCode" /> {{ sticker.city }}, {{ sticker.country }}</div>
      <h2>{{ sticker.title }}</h2>
      <div class="meta">{{ formatDate(sticker.date) }} · {{ formatKm(sticker.distanceKm) }} fra Aalborg</div>
      <span class="more">Se sticker →</span>
    </div>
    <button class="x" aria-label="Luk" @click.prevent.stop="$emit('close')">×</button>
  </NuxtLink>
</template>

<style scoped>
.sheet {
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: 12px;
  z-index: 600;
  display: flex;
  gap: 12px;
  padding: 10px;
  border: 2.5px solid var(--ink);
  border-radius: var(--radius);
  background: #fff;
  box-shadow: 4px 4px 0 var(--ink);
  text-decoration: none;
}
.thumb {
  position: relative;
  flex: none;
  width: 140px;
  height: 140px;
  overflow: hidden;
  border-radius: 12px;
  background: var(--paper-2);
}
.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.thumb .fallback {
  object-fit: contain;
  padding: 18px;
}
.count {
  position: absolute;
  right: 6px;
  bottom: 6px;
  padding: 1px 8px;
  border-radius: 999px;
  background: rgba(0, 0, 0, .7);
  color: #fff;
  font-size: 12px;
  font-weight: 800;
}
.info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 2px 26px 2px 0;
}
.place {
  font-size: 13px;
  font-weight: 600;
  color: var(--muted);
}
h2 {
  font-size: 19px;
  overflow-wrap: anywhere;
}
.meta {
  font-size: 13px;
  color: var(--muted);
}
.more {
  margin-top: auto;
  font-weight: 800;
}
.x {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 50%;
  background: var(--paper-2);
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
}
</style>
