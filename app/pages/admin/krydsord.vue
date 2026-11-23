<script setup lang="ts">
import { CROSSWORDS } from '../../../shared/utils/crosswords'
const puzzleId = useRoute().query.id === 'marvel' ? 'marvel' : '1'
const definition = CROSSWORDS[puzzleId]
const puzzleQuery = { id: puzzleId }

import type { CrosswordView, CrosswordPushStatus } from '../../../shared/types/crossword'
import { CROSSWORD_PHYSICAL_PRIZE } from '../../../shared/utils/crossword'
type AdminCrosswordView = CrosswordView & {
  pushStatus: CrosswordPushStatus
  prizeDeliveredAt: string | null
}
useHead({ title: 'Krydsord · Admin' })
const { admin, check } = useAdmin()
const view = ref<AdminCrosswordView | null>(null)
const pushMessage = computed(() => {
  const messages: Record<CrosswordPushStatus, string> = {
    development: 'Planlagte pushbeskeder sendes kun fra drift, ikke fra lokal test eller dev.',
    'not-configured':
      'Påmindelser mangler opsætning: tilføj QSTASH_TOKEN i Vercel og gem tidspunktet igen. Startdato og vinder kan stadig annonceres.',
    unscheduled: 'Vælg et tidspunkt for at planlægge pushbeskeder.',
    scheduled:
      'Startdatoen annonceres ved gemning. Påmindelser er planlagt 24 timer og én time før start samt ved åbning. Tidspunkter, der allerede er passeret, springes over. Vinderen annonceres, når krydsordet løses.',
    failed: 'Tidspunktet er gemt, men push kunne ikke planlægges. Prøv at gemme tidspunktet igen.',
    pending:
      'Pushplanen mangler eller er fra en ældre version. Appen forsøger automatisk at planlægge kommende beskeder. Du kan også gemme tidspunktet igen.',
  }
  return view.value ? messages[view.value.pushStatus] : ''
})
const time = ref('')
const error = ref('')
const saved = ref(false)
const busy = ref(false)
const delivering = ref(false)
async function delivery() {
  if (!view.value?.winner || delivering.value) return
  delivering.value = true
  error.value = ''
  try {
    const result = await $fetch<{ deliveredAt: string | null }>('/api/admin/crossword/delivery', {
      query: puzzleQuery,
      method: 'POST',
      body: { delivered: !view.value.prizeDeliveredAt },
    })
    view.value.prizeDeliveredAt = result.deliveredAt
  } catch (err: any) {
    error.value = err?.data?.statusMessage || 'Kunne ikke gemme udleveringen.'
  } finally {
    delivering.value = false
  }
}
const helpTime = computed(() =>
  view.value?.helpAt
    ? new Date(view.value.helpAt).toLocaleString('da-DK', {
        timeZone: 'Europe/Copenhagen',
        dateStyle: 'long',
        timeStyle: 'short',
      })
    : '',
)
function setView(data: AdminCrosswordView) {
  view.value = data
  time.value = data.opensAt
    ? new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'Europe/Copenhagen',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      })
        .format(new Date(data.opensAt))
        .replace(' ', 'T')
    : ''
}
onMounted(async () => {
  if (!(await check())) return
  try {
    setView(await $fetch<AdminCrosswordView>('/api/admin/crossword', { query: puzzleQuery }))
  } catch (err: any) {
    error.value = err?.data?.statusMessage || 'Kunne ikke hente krydsordet.'
  }
})
async function save() {
  busy.value = true
  error.value = ''
  saved.value = false
  try {
    setView(
      await $fetch<AdminCrosswordView>('/api/admin/crossword', {
        query: puzzleQuery,
        method: 'PUT',
        body: { opensAt: time.value || null },
      }),
    )
    saved.value = true
  } catch (err: any) {
    error.value = err?.data?.statusMessage || 'Kunne ikke gemme tidspunktet.'
  } finally {
    busy.value = false
  }
}
</script>
<template>
  <div class="admin-crossword">
    <PageHeader
      :title="definition.title"
      back-to="/admin?section=krydsord"
    />
    <p v-if="admin === false">Log ind på <NuxtLink to="/admin">adminsiden</NuxtLink> først.</p>
    <section
      v-else-if="view"
      class="panel"
    >
      <h2>Åbningstidspunkt</h2>
      <p
        :class="{ error: ['not-configured', 'failed', 'pending'].includes(view.pushStatus) }"
        role="status"
      >
        {{ pushMessage }}
      </p>
      <p>
        Spillet ses i menuen, men indholdet er skjult indtil åbningen. Alle tidspunkter er dansk tid
        (Europe/Copenhagen).
      </p>
      <form @submit.prevent="save">
        <label
          >Dato og klokkeslæt<input
            v-model="time"
            type="datetime-local"
            :disabled="view.open || busy"
        /></label>
        <p class="help">
          Lad feltet være tomt for at vente med at planlægge åbningen. Et åbnet spil kan ikke lukkes
          eller nulstilles her.
        </p>
        <p class="help">
          {{
            helpTime
              ? 'Første hjælp: ' + helpTime + '.'
              : 'Hjælpen starter kl. 04.00, når åbningsdagen og én hel ekstra kalenderdag er gået.'
          }}
          Derefter bliver rigtige bogstaver markeret grønt hver dag kl. 04.00, indtil krydsordet er
          løst.
        </p>
        <button
          class="btn"
          type="submit"
          :disabled="view.open || busy"
        >
          {{ busy ? 'Gemmer…' : 'Gem tidspunkt' }}
        </button>
      </form>
      <p
        v-if="saved"
        role="status"
      >
        Tidspunktet er gemt.
      </p>
      <div class="reward">
        <img
          class="mug-prize"
          :src="
            definition.physicalPrize
              ? CROSSWORD_PHYSICAL_PRIZE.image
              : '/badges/custom/crossword-marvel-winner.webp'
          "
          alt="Vinderpræmie"
        />
        <strong
          >Én vinder · {{ definition.physicalPrize ? 'RTA-kop + ' : ''
          }}{{ definition.winnerPrize }} bananer + vinderbadge</strong
        >
        <p v-if="definition.profileFrame">
          Vinderen får også en eksklusiv profilramme og et profilbanner til {{ definition.title }}.
        </p>
        <p>
          Den første servergodkendte løsning vinder.
          {{
            definition.completionPrize
              ? 'Øvrige brugere får ' +
                definition.completionPrize +
                ' bananer én gang for at gennemføre.'
              : 'Andre må gerne færdiggøre krydsordet uden præmie.'
          }}
        </p>
      </div>
      <p v-if="view.winner">
        Vinder: <strong>{{ view.winner.name }}</strong>
      </p>
      <div
        v-if="view.winner && definition.physicalPrize"
        class="delivery-status"
      >
        <p>
          {{
            view.prizeDeliveredAt
              ? 'RTA-koppen er udleveret.'
              : 'RTA-koppen afventer udlevering til ' + view.winner.name + '.'
          }}
        </p>
        <button
          class="btn secondary"
          :disabled="delivering"
          @click="delivery"
        >
          {{
            delivering
              ? 'Gemmer…'
              : view.prizeDeliveredAt
                ? 'Fortryd udlevering'
                : 'Markér kop som udleveret'
          }}
        </button>
      </div>
      <NuxtLink
        class="answer-link"
        :to="'/admin/krydsord-deltagere?id=' + puzzleId"
        >Se deltagernes nuværende løsninger →</NuxtLink
      >
      <NuxtLink
        class="answer-link"
        :to="'/admin/krydsord-facit?id=' + puzzleId"
        >Vis facit →</NuxtLink
      >
      <NuxtLink
        class="preview-link"
        :to="'/spil/krydsord?preview=1&id=' + puzzleId"
        >Forhåndsvis krydsordet uden præmier →</NuxtLink
      >
    </section>
    <p
      v-if="error"
      class="error"
      role="alert"
    >
      {{ error }}
    </p>
  </div>
</template>
<style scoped>
.admin-crossword {
  max-width: 560px;
  margin: 0 auto;
  padding: calc(20px + var(--safe-t)) 16px 30px;
}
.panel {
  padding: 22px;
  border: 1px solid var(--hairline);
  border-radius: 22px;
  background: var(--surface);
}
h2 {
  font-size: 22px;
}
p {
  font-size: 13px;
  color: var(--muted);
  line-height: 1.65;
}
label {
  display: grid;
  gap: 8px;
  font-size: 13px;
  font-weight: 700;
  margin-top: 20px;
}
input {
  min-height: 48px;
  width: 100%;
  border: 1px solid var(--hairline);
  border-radius: 12px;
  padding: 10px;
  background: var(--surface-2);
}
.help {
  font-size: 11px;
}
.reward {
  margin-top: 24px;
  padding-top: 18px;
  border-top: 1px solid var(--hairline);
  font-size: 13px;
}
.mug-prize {
  display: block;
  width: 100px;
  height: 100px;
  object-fit: contain;
  margin-bottom: 12px;
}
.preview-link {
  display: flex;
  align-items: center;
  min-height: 64px;
  padding: 16px;
  border: 1px solid var(--hairline);
  border-radius: 12px;
  background: var(--surface-2);
  text-decoration: none;
  margin-top: 22px;
  font-size: 13px;
  font-weight: 700;
}
.answer-link {
  display: flex;
  align-items: center;
  min-height: 64px;
  margin-top: 24px;
  padding: 14px 16px;
  border: 1px solid var(--hairline);
  border-radius: 12px;
  background: var(--surface-2);
  font-size: 14px;
  font-weight: 800;
  text-decoration: none;
}
.error {
  color: var(--text);
}
</style>
