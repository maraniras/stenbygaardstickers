<script setup lang="ts">
import type { ProfileBanner } from '../../shared/utils/profile-banners'
defineProps<{ banner: ProfileBanner; name?: string | null }>()
</script>

<template>
  <span
    class="banner-preview"
    aria-hidden="true"
  >
    <img
      :src="banner.image"
      alt=""
    />
    <span class="identity">
      <UserAvatar
        :name="name || 'Dig'"
        class="avatar"
      />
      <strong>{{ name || 'Dit navn' }}</strong>
    </span>
  </span>
</template>

<style scoped>
.banner-preview {
  display: grid;
  place-items: center;
  position: relative;
  width: 100%;
  aspect-ratio: 3 / 1;
  overflow: hidden;
  border-radius: 14px;
  isolation: isolate;
}
.banner-preview > img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: -2;
}
.banner-preview::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(transparent, #0007);
  z-index: -1;
}
.identity {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 8px;
  min-width: 0;
  max-width: 100%;
  color: white;
  text-shadow: 0 1px 5px #000;
}
.avatar {
  width: clamp(26px, 8vw, 44px);
  height: clamp(26px, 8vw, 44px);
  flex-shrink: 0;
}
strong {
  font-size: clamp(10px, 2.4vw, 14px);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
