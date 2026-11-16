<script setup lang="ts">
import { emptyDailyStats } from '../../../shared/utils/economy'

if (!import.meta.dev) throw createError({ statusCode: 404, statusMessage: 'Siden findes ikke' })
useHead({ title: 'Pakkelegs Champ · Forhåndsvisning' })
const show = ref(true)
// Only an in-memory demonstration. Never passed to a wallet, user or reward API.
const badge = badgesFor(
  'Preview',
  [],
  {},
  {
    economy: {
      preview: {
        balance: 0,
        peakBalance: 0,
        stats: emptyDailyStats(),
        milestones: {},
        parcelAchievements: { 'parcel-five': '2026-12-28T12:00:00.000Z' },
      },
    },
  },
).find((b) => b.id === 'parcel-five')!
</script>

<template>
  <div class="page champ-preview">
    <PageHeader
      title="Badgepreview"
      back-to="/spil/pakkeleg"
    />
    <p>Lokal forhåndsvisning – badgen er ikke tildelt nogen bruger.</p>
    <button
      type="button"
      class="preview-medal"
      @click="show = true"
    >
      <BadgeMedal
        :badge="badge"
        big
      />
      <span>Vis badgen</span>
    </button>
    <BadgeSheet
      v-if="show"
      :badge="badge"
      person="Forhåndsvisning"
      @close="show = false"
    />
  </div>
</template>

<style scoped>
.champ-preview > p {
  margin: 12px 0 24px;
  color: var(--muted);
  text-align: center;
  font-size: 13px;
}
.preview-medal {
  display: grid;
  justify-items: center;
  gap: 16px;
  margin: 24px auto;
  padding: 24px;
  border: 1px solid var(--hairline);
  border-radius: 24px;
  background: var(--surface);
  color: var(--text);
}
</style>
