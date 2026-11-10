<script setup lang="ts">
import type { AdventOpening, AdventPhysicalWinner } from '../../../shared/types/advent'
useHead({ title: 'Julekalender · Admin' })
const { data, error, refresh, status } = await useFetch<{
  year: number
  physicalWinners: AdventPhysicalWinner[]
  drafts: { day: number; published: boolean }[]
  claims: (AdventOpening & { name: string })[]
  draw: {
    locked: boolean
    cutoff: string
    participants: string[]
    awards: { reward: string; winner: string; day: number }[]
  }
}>('/api/admin/advent')
const openedPrizes = computed(
  () => data.value?.physicalWinners.filter((entry) => entry.openedAt).length ?? 0,
)
const deliveredPrizes = computed(
  () => data.value?.physicalWinners.filter((entry) => entry.deliveredAt).length ?? 0,
)
const savingDelivery = ref(''),
  deliveryError = ref('')
async function setDelivered(entry: AdventPhysicalWinner) {
  if (savingDelivery.value) return
  savingDelivery.value = entry.id
  deliveryError.value = ''
  try {
    await $fetch('/api/admin/advent/delivery', {
      method: 'POST',
      body: { id: entry.id, delivered: !entry.deliveredAt },
      retry: 0,
    })
    await refresh()
  } catch (e: any) {
    deliveryError.value = e?.data?.statusMessage || 'Status kunne ikke gemmes. Prøv igen.'
  } finally {
    savingDelivery.value = ''
  }
}
</script>
<template>
  <div class="page">
    <PageHeader
      title="Julekalender"
      back-to="/admin"
      description="Personlige fund, vindere og udlevering af virkelige præmier."
    >
      <template #actions
        ><button
          class="refresh"
          type="button"
          :disabled="status === 'pending'"
          @click="refresh()"
        >
          {{ status === 'pending' ? 'Henter…' : 'Opdatér' }}
        </button></template
      >
    </PageHeader>
    <p
      v-if="error"
      role="alert"
    >
      Log ind som admin for at se kalenderen. <button @click="refresh()">Prøv igen</button>
    </p>
    <template v-if="data">
      <p class="hint">
        {{
          data.draw.locked
            ? `Lodtrækning låst · ${data.draw.participants.length} deltagere`
            : 'Deltagerlisten låses 1. december kl. 00.00 dansk tid.'
        }}
      </p>
      <h2>Virkelige præmier · {{ data.year }}</h2>
      <p
        v-if="!data.draw.locked"
        class="hint"
      >
        Vinderne vises her, når lodtrækningen er foretaget efter 1. december kl. 00.00. Der uddeles
        fem Mix Max, én rødvin, én hvidvin, to cykeldrikkedunke og to Faxe Kondi-flasker. Der er
        også én træstammegave, hvis Ida eller Marc deltager; kun de to kan vinde den, i en låge fra
        10. til 18. december.
      </p>
      <template v-else>
        <p class="hint">
          {{ openedPrizes }} af {{ data.physicalWinners.length }} præmier fundet ·
          {{ deliveredPrizes }} udleveret. Du kan også se tildelte præmier, som vinderen endnu ikke
          har åbnet.
        </p>
        <p
          v-if="deliveryError"
          role="alert"
        >
          {{ deliveryError }}
        </p>
        <p
          v-if="!data.physicalWinners.length"
          class="hint"
        >
          Ingen fysiske præmier blev tildelt i lodtrækningen.
        </p>
        <AdventPhysicalPrize
          v-for="entry in data.physicalWinners"
          :key="entry.id"
          :entry="entry"
          :saving="savingDelivery"
          @toggle="setDelivered"
        />
      </template>
      <h2>Kalenderens låger</h2>
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
        ><span
          v-for="(extra, i) in entry.extras"
          :key="i"
          >{{ extra.title }}</span
        ><small
          >{{ formatDate(entry.openedAt.slice(0, 10))
          }}<template v-if="entry.fulfilment">
            · {{ entry.fulfilment === 'delivered' ? 'Udleveret' : 'Afventer udlevering' }}</template
          ></small
        >
      </article>
    </template>
  </div>
</template>
<style scoped>
.refresh {
  min-height: 44px;
  padding: 8px 12px;
  border: 1px solid var(--hairline);
  border-radius: 12px;
  color: var(--text);
  background: var(--surface);
  font-size: 12px;
}
.page {
  max-width: 640px;
  margin: 0 auto;
  padding: calc(20px + var(--safe-t)) 16px 20px;
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
