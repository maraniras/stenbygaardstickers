<script setup lang="ts">
defineProps<{ view: 'map' | 'list' }>()
const { target } = useExplore()
const route = useRoute()
const filtersOpen = ref(false)
const filterCount = computed(() => Number(!!route.query.by) + Number(!!route.query.country))
onDeactivated(() => {
  filtersOpen.value = false
})
</script>

<template>
  <div class="explore-toolbar">
    <nav
      class="view-switch glass"
      aria-label="Vis stickers som"
    >
      <NuxtLink
        :to="target('/')"
        :class="{ active: view === 'map' }"
        :aria-current="view === 'map' ? 'page' : undefined"
        >Kort</NuxtLink
      >
      <NuxtLink
        :to="target('/liste')"
        :class="{ active: view === 'list' }"
        :aria-current="view === 'list' ? 'page' : undefined"
        >Liste</NuxtLink
      >
    </nav>
    <UploadButton />
    <button
      class="filter-button glass"
      :aria-label="filterCount ? `Filtre, ${filterCount} aktive` : 'Filtre'"
      :aria-expanded="filtersOpen"
      aria-haspopup="dialog"
      @click="filtersOpen = true"
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path d="M4 7h16M7 12h10M10 17h4" /></svg
      ><span
        v-if="filterCount"
        class="filter-count"
        >{{ filterCount }}</span
      >
    </button>
    <ExploreFilters
      v-if="filtersOpen"
      @close="filtersOpen = false"
    />
  </div>
</template>

<style scoped>
.explore-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
}
.view-switch {
  display: flex;
  gap: 3px;
  padding: 4px;
  border-radius: 16px;
}
.view-switch a {
  display: grid;
  place-items: center;
  min-width: 78px;
  min-height: 40px;
  padding: 0 14px;
  border-radius: 12px;
  color: var(--muted);
  text-decoration: none;
  font-size: 13px;
  font-weight: 750;
}
.view-switch .active {
  background: var(--ink);
  color: #fff;
}
a:focus-visible {
  outline: 2px solid var(--text);
  outline-offset: 3px;
}
.filter-button {
  position: relative;
  display: grid;
  place-items: center;
  flex: none;
  width: 48px;
  height: 48px;
  border: 0;
  border-radius: 16px;
  color: var(--text);
  cursor: pointer;
}
.filter-button svg {
  width: 23px;
  height: 23px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
}
.filter-count {
  position: absolute;
  top: 0;
  right: 0;
  width: 18px;
  height: 18px;
  border-radius: 99px;
  background: var(--ink);
  color: #fff;
  font-size: 10px;
  font-weight: 800;
}
.filter-button:focus-visible {
  outline: 2px solid var(--text);
  outline-offset: 3px;
}
</style>
