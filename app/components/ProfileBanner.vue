<script setup lang="ts">
defineProps<{ src: string }>()
</script>
<template>
  <div
    class="profile-banner"
    aria-hidden="true"
  >
    <img
      :src="src"
      alt=""
      loading="lazy"
    />
  </div>
</template>
<style scoped>
.profile-banner {
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  border-radius: inherit;
  pointer-events: none;
  background: #031909;
}
img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
  object-position: center bottom;
}
.profile-banner::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, #001508b3, #00150870 60%, #00150810);
}
</style>
