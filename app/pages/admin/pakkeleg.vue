<script setup lang="ts">
import type { ParcelAdminCampaign, ParcelPhysicalWinner } from '../../../shared/types/parcel-game'
import { parcelRewardIcon } from '../../../shared/utils/parcel-rewards'
useHead({ title: 'Pakkeleg · Admin' })
const preview = import.meta.dev && useRoute().query.preview === '1'
const {
  data: loaded,
  error,
  status,
  refresh,
} = await useFetch<{ campaigns: ParcelAdminCampaign[] }>('/api/admin/parcels', {
  immediate: !preview,
})
// Entirely isolated UI fixture: never reads/writes a game, wallet or real delivery.
const demo = ref<ParcelAdminCampaign[]>(
  preview
    ? [
        {
          year: 2026,
          phase: 'ended',
          participants: 10,
          physicalWinners: [
            {
              winner: 'Nicole',
              reward: { kind: 'mix-max', title: 'Mix Max', amount: 50 },
              openedAt: '2026-12-28T12:00:00Z',
              deliveredAt: null,
            },
            {
              winner: 'Norsk',
              reward: { kind: 'cake', title: 'Træstammer', amount: 50 },
              openedAt: null,
              deliveredAt: null,
            },
            {
              winner: 'Mathias',
              reward: { kind: 'faxe-kondi', title: 'Faxe Kondi', amount: 50 },
              openedAt: '2026-12-28T12:00:00Z',
              deliveredAt: '2026-12-29T10:00:00Z',
            },
            {
              winner: 'Nicole',
              reward: { kind: 'bottle', title: 'Drikkedunk', amount: 50 },
              openedAt: '2026-12-28T12:00:00Z',
              deliveredAt: null,
            },
            {
              winner: 'Tobias Frost',
              reward: { kind: 'bottle', title: 'Drikkedunk', amount: 50 },
              openedAt: null,
              deliveredAt: null,
            },
            {
              winner: null,
              reward: { kind: 'snowglobe', title: 'RTA-snekugle', amount: 50 },
              openedAt: null,
              deliveredAt: null,
            },
          ].map(
            (entry, i) =>
              ({
                ...entry,
                id: `2026:p${i + 1}`,
                year: 2026,
                parcelId: `p${i + 1}`,
              }) as ParcelPhysicalWinner,
          ),
        },
      ]
    : [],
)
const campaigns = computed(() => (preview ? demo.value : (loaded.value?.campaigns ?? [])))
const saving = ref(''),
  deliveryError = ref('')
const phases = {
  waiting: 'Ikke startet',
  registration: 'Tilmelding åben',
  playing: 'I gang',
  ended: 'Afsluttet',
  cancelled: 'Aflyst',
}
async function toggle(entry: ParcelPhysicalWinner) {
  if (saving.value || !entry.openedAt || !entry.winner) return
  saving.value = entry.id
  deliveryError.value = ''
  try {
    if (preview) entry.deliveredAt = entry.deliveredAt ? null : new Date().toISOString()
    else {
      await $fetch('/api/admin/parcels/delivery', {
        method: 'POST',
        body: { id: entry.id, delivered: !entry.deliveredAt },
        retry: 0,
      })
      await refresh()
    }
  } catch (e: any) {
    deliveryError.value = e?.data?.statusMessage || 'Status kunne ikke gemmes. Prøv igen.'
  } finally {
    saving.value = ''
  }
}
</script>
<template>
  <div class="page">
    <PageHeader
      title="Pakkeleg"
      back-to="/admin"
      description="Vindere og udlevering af de fysiske præmier."
    >
      <template #actions
        ><button
          class="chip"
          :disabled="status === 'pending' || preview"
          @click="refresh()"
        >
          Opdatér
        </button></template
      >
    </PageHeader>
    <p
      v-if="preview"
      class="hint"
    >
      Testoversigt · fiktive vindere. Knapperne ændrer kun denne visning.
    </p>
    <p
      v-if="error && !preview"
      role="alert"
    >
      Log ind som admin for at se præmierne. <NuxtLink to="/admin">Gå til admin</NuxtLink>
    </p>
    <p
      v-else-if="status === 'pending' && !preview"
      role="status"
    >
      Henter præmier…
    </p>
    <p
      v-else-if="!campaigns.length"
      class="hint"
    >
      Ingen pakkeleg er oprettet endnu. Oversigten starter ikke et spil.
    </p>
    <p
      v-if="deliveryError"
      role="alert"
    >
      {{ deliveryError }}
    </p>
    <section
      v-for="campaign in campaigns"
      :key="campaign.year"
      class="campaign"
    >
      <h2>Pakkeleg {{ campaign.year }}</h2>
      <p class="hint">{{ phases[campaign.phase] }} · {{ campaign.participants }} deltagere</p>
      <p
        v-if="campaign.phase === 'cancelled'"
        class="hint"
      >
        Spillet blev aflyst. Der uddeles ingen præmier.
      </p>
      <p
        v-else-if="campaign.phase !== 'ended'"
        class="hint"
      >
        Indhold og endelige vindere vises først, når pakkelegen er afsluttet.
      </p>
      <template v-else>
        <p class="hint">
          {{ campaign.physicalWinners.filter((p) => p.openedAt).length }} af
          {{ campaign.physicalWinners.length }} gaver åbnet ·
          {{ campaign.physicalWinners.filter((p) => p.deliveredAt).length }} udleveret
        </p>
        <p
          v-if="!campaign.physicalWinners.length"
          class="hint"
        >
          Ingen fysiske præmier i denne pakkeleg.
        </p>
        <article
          v-for="entry in campaign.physicalWinners"
          :key="entry.id"
          class="prize"
        >
          <img
            :src="parcelRewardIcon(entry.reward)"
            alt=""
          />
          <div class="prize-body">
            <b
              >{{ entry.reward.title }} <small>· Pakke #{{ entry.parcelId.slice(1) }}</small></b
            >
            <NuxtLink
              v-if="entry.winner"
              :to="`/person/${encodeURIComponent(entry.winner)}`"
              >{{ entry.winner }}</NuxtLink
            >
            <span v-else>Ingen vinder · blev på fællesbordet</span>
            <small v-if="entry.openedAt">Åbnet {{ formatDate(entry.openedAt.slice(0, 10)) }}</small>
            <small v-if="entry.deliveredAt"
              >Udleveret {{ formatDate(entry.deliveredAt.slice(0, 10)) }}</small
            >
            <span class="prize-status">{{
              entry.deliveredAt
                ? 'Udleveret'
                : entry.openedAt
                  ? 'Afventer udlevering'
                  : entry.winner
                    ? 'Ikke åbnet endnu'
                    : 'Ikke vundet'
            }}</span>
            <button
              v-if="entry.winner && entry.openedAt"
              class="chip"
              :disabled="!!saving"
              :aria-label="`${entry.deliveredAt ? 'Fortryd udlevering af' : 'Markér udleveret:'} ${entry.reward.title}, pakke ${entry.parcelId.slice(1)}`"
              @click="toggle(entry)"
            >
              {{
                saving === entry.id
                  ? 'Gemmer…'
                  : entry.deliveredAt
                    ? 'Fortryd udlevering'
                    : 'Markér udleveret'
              }}
            </button>
          </div>
        </article>
      </template>
    </section>
  </div>
</template>
<style scoped>
.page {
  max-width: 680px;
  margin: 0 auto;
  padding: calc(20px + var(--safe-t)) 16px 24px;
}
.hint {
  color: var(--muted);
  font-size: 13px;
  line-height: 1.6;
}
.campaign {
  margin-top: 24px;
}
.prize {
  display: flex;
  gap: 14px;
  align-items: flex-start;
  padding: 16px;
  margin: 12px 0;
  border: 1px solid var(--hairline);
  border-radius: 18px;
  background: var(--surface);
}
.prize img {
  flex: 0 0 68px;
  width: 68px;
  height: 76px;
  object-fit: contain;
}
.prize-body {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  min-width: 0;
  overflow-wrap: anywhere;
}
.prize small {
  color: var(--muted);
  font-size: 11px;
  font-weight: 500;
}
.prize-status {
  font-size: 12px;
  font-weight: 700;
}
.prize .chip {
  min-height: 44px;
  white-space: normal;
  text-align: left;
}
</style>
