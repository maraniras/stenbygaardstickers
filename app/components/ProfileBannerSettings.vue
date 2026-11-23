<script setup lang="ts">
import { profileBanner } from '../../shared/utils/profile-banners'
const { inventory, loading, saving, error, load, equip } = useProfileBanners()
const owned = computed(() =>
  inventory.value.owned.flatMap((id) => {
    const banner = profileBanner(id)
    return banner ? [banner] : []
  }),
)
</script>
<template>
  <section
    class="banner-settings"
    aria-labelledby="my-banners-title"
  >
    <h2 id="my-banners-title">Dine profilbannere</h2>
    <p>
      Vælg baggrunden på dit brugerkort og øverst på din profil. Valget følger dig på alle dine
      enheder.
    </p>
    <p
      v-if="loading"
      role="status"
    >
      Henter dine bannere…
    </p>
    <div
      v-else
      class="choices"
      role="group"
      aria-label="Profilbanner"
    >
      <button
        type="button"
        :aria-pressed="inventory.equipped === null"
        :disabled="saving"
        @click="equip(null)"
      >
        <span class="banner-preview empty">Intet banner</span>
        <strong>Intet banner</strong>
      </button>
      <button
        v-for="banner in owned"
        :key="banner.id"
        type="button"
        :aria-pressed="inventory.equipped === banner.id"
        :disabled="saving"
        @click="equip(banner.id)"
      >
        <span class="banner-preview"><ProfileBanner :src="banner.image" /></span>
        <strong>{{ banner.name }}</strong>
      </button>
    </div>
    <p v-if="!loading && !owned.length && !error">
      Du har ingen profilbannere endnu. Her vises de bannere, du vinder.
    </p>
    <p
      v-if="saving"
      role="status"
    >
      Gemmer banner…
    </p>
    <p
      v-if="error"
      role="alert"
    >
      {{ error }}
      <button
        class="retry"
        @click="load"
      >
        Prøv igen
      </button>
    </p>
  </section>
</template>
<style scoped>
.banner-settings {
  padding: 18px;
  border-radius: var(--radius);
  background: var(--surface);
  box-shadow: var(--shadow-sm);
}
h2 {
  font-size: 18px;
}
p {
  color: var(--muted);
  font-size: 13px;
  line-height: 1.6;
  margin: 10px 0;
}
.choices {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 10px;
  margin-block: 14px;
}
.choices button {
  padding: 8px;
  min-width: 0;
  border: 2px solid transparent;
  border-radius: 16px;
  background: var(--surface-2);
  color: var(--text);
}
.choices button[aria-pressed='true'] {
  border-color: var(--accent);
  background: var(--accent-soft);
}
.banner-preview {
  position: relative;
  display: block;
  aspect-ratio: 3/1;
  border-radius: 8px;
  overflow: hidden;
}
.empty {
  display: grid;
  place-items: center;
  background: var(--surface);
  font-size: 12px;
  color: var(--muted);
}
strong {
  display: block;
  font-size: 12px;
  margin-top: 7px;
}
.retry {
  min-height: 44px;
  border: 0;
  background: transparent;
  color: var(--text);
  font: inherit;
  text-decoration: underline;
}
</style>
