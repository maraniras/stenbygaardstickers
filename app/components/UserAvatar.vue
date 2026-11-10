<script setup lang="ts">
// Profilbillede eller forbogstav. Størrelse, form og farve kommer fra forælderens
// klasse (fx class="avatar"), så den passer ind, hvor forbogstavet sad før.
const props = defineProps<{ name: string }>()
const { avatarFor, frameFor } = useUsers()
const src = computed(() => avatarFor(props.name))
const failed = ref(false)
watch(src, () => {
  failed.value = false
})
</script>

<template>
  <span
    class="user-avatar"
    :class="{ photo: src && !failed, framed: !!frameFor(name) }"
  >
    <img
      v-if="src && !failed"
      :src="src"
      alt=""
      loading="lazy"
      @error="failed = true"
    />
    <template v-else>{{ name[0] }}</template>
    <img
      v-if="frameFor(name)"
      class="avatar-frame"
      src="/games/parcels/exclusive-frame.webp"
      alt="Eksklusiv juleprofilramme"
    />
  </span>
</template>

<style scoped>
.user-avatar.framed {
  position: relative;
  overflow: visible;
}
.framed > img:not(.avatar-frame) {
  border-radius: inherit;
}
.avatar-frame {
  position: absolute;
  inset: -22%;
  width: 144%;
  height: 144%;
  object-fit: contain;
  pointer-events: none;
  z-index: 1;
}
.user-avatar {
  overflow: hidden;
  flex: none;
}
.photo {
  background: var(--surface-2) !important;
}
img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
