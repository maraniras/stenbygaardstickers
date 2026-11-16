<script setup lang="ts">
import { profileFrame } from '../../shared/utils/profile-frames'
const { name } = useUser()
const { inventory, loading, saving, error, load, equip } = useProfileFrames()
const owned = computed(() =>
  inventory.value.owned.flatMap((id) => {
    const frame = profileFrame(id)
    return frame ? [frame] : []
  }),
)
</script>

<template>
  <section
    class="frame-settings"
    aria-labelledby="my-frames-title"
  >
    <h2 id="my-frames-title">Dine profilrammer</h2>
    <p>Vælg en ramme til dit profilbillede. Dit valg følger dig på alle dine enheder.</p>
    <p
      v-if="loading"
      role="status"
    >
      Henter dine rammer…
    </p>
    <div
      v-else
      class="choices"
      role="group"
      aria-label="Profilramme"
    >
      <button
        type="button"
        :aria-pressed="inventory.equipped === null"
        :disabled="saving"
        @click="equip(null)"
      >
        <ProfileFramePreview :name="name" />
        <strong>Ingen ramme</strong>
      </button>
      <button
        v-for="frame in owned"
        :key="frame.id"
        type="button"
        :aria-pressed="inventory.equipped === frame.id"
        :disabled="saving"
        @click="equip(frame.id)"
      >
        <ProfileFramePreview
          :frame="frame"
          :name="name"
        />
        <strong>{{ frame.name }}</strong>
      </button>
    </div>
    <p v-if="!loading && !owned.length && !error">
      Du har ingen rammer endnu. Her vises dem, du køber eller vinder.
    </p>
    <p
      v-if="saving"
      role="status"
    >
      Gemmer ramme…
    </p>
    <p
      v-if="error"
      class="err"
      role="alert"
    >
      {{ error }}
      <button
        class="link"
        @click="load"
      >
        Prøv igen
      </button>
    </p>
    <NuxtLink
      class="link"
      to="/shop"
      >Se profilrammer i shoppen →</NuxtLink
    >
  </section>
</template>

<style scoped>
.frame-settings {
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
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 10px;
  margin-block: 14px;
}
.choices button {
  padding: 10px 8px;
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
strong {
  display: block;
  font-size: 12px;
  margin-top: 5px;
}
.link {
  font-size: 13px;
}
</style>
