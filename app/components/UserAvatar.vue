<script setup lang="ts">
// Profilbillede eller forbogstav. Størrelse, form og farve kommer fra forælderens
// klasse (fx class="avatar"), så den passer ind, hvor forbogstavet sad før.
const props = defineProps<{ name: string }>()
const { avatarFor } = useUsers()
const src = computed(() => avatarFor(props.name))
const failed = ref(false)
watch(src, () => {
  failed.value = false
})
</script>

<template>
  <span
    class="user-avatar"
    :class="{ photo: src && !failed }"
  >
    <img
      v-if="src && !failed"
      :src="src"
      alt=""
      loading="lazy"
      @error="failed = true"
    />
    <template v-else>{{ name[0] }}</template>
  </span>
</template>

<style scoped>
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
