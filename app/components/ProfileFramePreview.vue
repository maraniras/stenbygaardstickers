<script setup lang="ts">
import type { ProfileFrame } from '../../shared/utils/profile-frames'
const props = defineProps<{ frame?: ProfileFrame; name?: string | null }>()
const { avatarFor } = useUsers()
const avatar = computed(() => (props.name ? avatarFor(props.name) : undefined))
const failed = ref(false)
watch(avatar, () => {
  failed.value = false
})
</script>

<template>
  <span
    class="frame-preview"
    aria-hidden="true"
  >
    <span class="portrait">
      <img
        v-if="avatar && !failed"
        :src="avatar"
        alt=""
        @error="failed = true"
      />
      <span v-else>{{ name?.[0]?.toLocaleUpperCase('da') || 'S' }}</span>
    </span>
    <img
      v-if="frame"
      class="frame"
      :src="frame.image"
      alt=""
    />
  </span>
</template>

<style scoped>
.frame-preview {
  display: block;
  width: 100%;
  aspect-ratio: 1;
  position: relative;
}
.portrait {
  position: absolute;
  inset: 18%;
  display: grid;
  place-items: center;
  border-radius: 50%;
  overflow: hidden;
  background: var(--accent-soft);
  color: var(--text);
  font-size: 32px;
  font-weight: 800;
}
.portrait img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.frame {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  pointer-events: none;
}
</style>
