<script setup lang="ts">
const { unread } = useActivity()
</script>
<template>
  <NuxtLink
    class="activity-button page-icon-button"
    to="/aktivitet"
    :aria-label="unread ? `Din aktivitet, ${unread} ulæste` : 'Din aktivitet'"
    title="Din aktivitet"
  >
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
    </svg>
    <span
      v-if="unread"
      class="count"
      >{{ unread > 9 ? '9+' : unread }}</span
    >
  </NuxtLink>
</template>
<style scoped>
.activity-button {
  position: relative;
}
.count {
  position: absolute;
  top: -2px;
  right: -2px;
  display: grid;
  place-items: center;
  min-width: 18px;
  height: 18px;
  padding: 0 3px;
  background: var(--accent);
  color: var(--on-accent);
  border-radius: 99px;
  font-size: 10px;
  font-weight: 800;
}
</style>
