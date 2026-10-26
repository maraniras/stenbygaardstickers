<script setup lang="ts">
const props = defineProps<{ sticker: Sticker }>()
const thumb = computed(() => thumbnail(props.sticker))
</script>

<template>
  <NuxtLink class="card" :to="`/sticker/${sticker.id}`">
    <div class="media">
      <img v-if="thumb" :src="thumb" alt="" loading="lazy">
      <img v-else src="/marker.png" alt="" class="fallback">
      <span class="flag-badge"><CountryFlag :code="sticker.countryCode" /></span>
      <span v-if="sticker.media.some(m => m.type === 'video')" class="tag">
        <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg> Video
      </span>
      <div class="over">
        <div class="place">{{ sticker.city }}, {{ sticker.country }}</div>
        <h3>{{ sticker.title }}</h3>
      </div>
    </div>
    <div class="meta">
      <span>{{ formatDate(sticker.date) }}</span>
      <span class="dot">·</span>
      <span>{{ formatKm(sticker.distanceKm) }}</span>
      <span class="right">
        <CommentCount :sticker-id="sticker.id" />
        <RatingBadge :sticker-id="sticker.id" />
      </span>
    </div>
  </NuxtLink>
</template>

<style scoped>
.card {
  display: block;
  overflow: hidden;
  border-radius: var(--radius);
  background: var(--surface);
  box-shadow: var(--shadow-sm);
  text-decoration: none;
  transition: transform .15s;
}
.card:active { transform: scale(.98); }
.media {
  position: relative;
  aspect-ratio: 4 / 3;
  background: var(--surface-2);
}
.media > img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.media > .fallback {
  object-fit: contain;
  padding: 18%;
}
.flag-badge {
  position: absolute;
  top: 12px;
  left: 12px;
  display: grid;
  place-items: center;
  padding: 5px 6px;
  border-radius: 8px;
  background: rgba(255, 255, 255, .85);
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
  font-size: 14px;
  line-height: 1;
}
.tag {
  position: absolute;
  top: 12px;
  right: 12px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px 4px 8px;
  border-radius: 999px;
  background: rgba(0, 0, 0, .45);
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
}
.tag svg { width: 12px; height: 12px; fill: currentColor; }
.over {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 48px 16px 14px;
  background: linear-gradient(transparent, rgba(0, 0, 0, .65));
  color: #fff;
}
.place {
  font-size: 13px;
  font-weight: 600;
  opacity: .9;
}
h3 {
  font-size: 22px;
  overflow-wrap: anywhere;
}
.meta {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 12px 16px;
  font-size: 13px;
  font-weight: 600;
  color: var(--muted);
}
.dot { opacity: .5; }
.right {
  display: inline-flex;
  gap: 10px;
  margin-left: auto;
  color: var(--text);
}
</style>
