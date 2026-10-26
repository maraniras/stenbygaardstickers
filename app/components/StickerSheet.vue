<script setup lang="ts">
const props = defineProps<{ sticker: Sticker }>()
defineEmits<{ close: [] }>()
const thumb = computed(() => thumbnail(props.sticker))
</script>

<template>
  <NuxtLink class="sheet glass" :to="`/sticker/${sticker.id}`">
    <div class="thumb">
      <img v-if="thumb" :src="thumb" alt="">
      <img v-else src="/marker.png" alt="" class="fallback">
      <span v-if="sticker.media.length > 1" class="count">+{{ sticker.media.length - 1 }}</span>
    </div>
    <div class="info">
      <div class="place"><CountryFlag :code="sticker.countryCode" /> {{ sticker.city }}, {{ sticker.country }}</div>
      <h2>{{ sticker.title }}</h2>
      <div class="meta">
        {{ formatDate(sticker.date) }}
        <RatingBadge :sticker-id="sticker.id" />
        <CommentCount :sticker-id="sticker.id" />
      </div>
      <div class="meta">{{ formatKm(sticker.distanceKm) }} fra Aalborg</div>
      <span class="more">Se sticker
        <svg viewBox="0 0 24 24"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>
      </span>
    </div>
    <button class="x" aria-label="Luk" @click.prevent.stop="$emit('close')">
      <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18" /></svg>
    </button>
  </NuxtLink>
</template>

<style scoped>
.sheet {
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: var(--nav-space);
  z-index: 600;
  display: flex;
  gap: 14px;
  max-width: 480px;
  margin: 0 auto;
  padding: 10px;
  border-radius: 26px;
  text-decoration: none;
}
.thumb {
  position: relative;
  flex: none;
  width: 112px;
  height: 136px;
  overflow: hidden;
  border-radius: 18px;
  background: var(--surface-2);
}
.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.thumb .fallback {
  object-fit: contain;
  padding: 16px;
}
.count {
  position: absolute;
  right: 6px;
  bottom: 6px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(0, 0, 0, .55);
  -webkit-backdrop-filter: blur(6px);
  backdrop-filter: blur(6px);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
}
.info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 4px 30px 4px 0;
}
.place {
  font-size: 13px;
  font-weight: 600;
  color: var(--muted);
}
h2 {
  margin: 2px 0;
  font-size: 20px;
  overflow-wrap: anywhere;
}
.meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--muted);
}
.meta :deep(.badge), .meta :deep(.count) { color: var(--text); }
.more {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: auto;
  font-size: 14px;
  font-weight: 700;
}
.more svg, .x svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.4;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.x {
  position: absolute;
  top: 10px;
  right: 10px;
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: rgba(17, 17, 20, .06);
  cursor: pointer;
}
</style>
