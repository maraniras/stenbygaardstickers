<script setup lang="ts">
import type { AdventOpening } from '../../../shared/types/advent'
useHead({ title: 'Julekalender · Admin' })
const { data, error, refresh } = await useFetch<{
  year: number
  drafts: { day: number; published: boolean }[]
  claims: (AdventOpening & { name: string })[]
}>('/api/admin/advent')
</script>
<template>
  <div class="page">
    <PageHeader
      title="Julekalender"
      back-to="/admin"
      description="Præmiekladder og gemte åbninger. Virkelige præmier står som afventer udlevering."
    />
    <p
      v-if="error"
      role="alert"
    >
      Log ind som admin for at se kalenderen. <button @click="refresh()">Prøv igen</button>
    </p>
    <template v-if="data">
      <h2>Præmier · {{ data.year }}</h2>
      <div class="drafts">
        <span
          v-for="door in data.drafts"
          :key="door.day"
          >{{ door.day }}<small>{{ door.published ? 'Klar' : 'Kladde' }}</small></span
        >
      </div>
      <h2>Åbnede låger</h2>
      <p
        v-if="!data.claims.length"
        class="hint"
      >
        Ingen gemte åbninger endnu.
      </p>
      <article
        v-for="entry in data.claims"
        :key="`${entry.name}:${entry.day}`"
      >
        <b>{{ entry.name }} · låge {{ entry.day }}</b
        ><span>{{ entry.prize.title }}</span
        ><small
          >{{ formatDate(entry.openedAt.slice(0, 10))
          }}<template v-if="entry.fulfilment"> · Afventer udlevering</template></small
        >
      </article>
    </template>
  </div>
</template>
<style scoped>
.page {
  max-width: 640px;
  margin: 0 auto;
  padding: calc(20px + var(--safe-t)) 16px var(--nav-space);
}
h2 {
  margin: 24px 0 12px;
  font-size: 18px;
}
.drafts {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 8px;
}
.drafts span,
article {
  display: grid;
  gap: 4px;
  padding: 12px;
  border: 1px solid var(--hairline);
  border-radius: 12px;
  background: var(--surface);
}
.drafts span {
  text-align: center;
  font-weight: 800;
}
small,
.hint {
  color: var(--muted);
  font-size: 11px;
  font-weight: 400;
}
article {
  margin-bottom: 10px;
  font-size: 13px;
}
</style>
