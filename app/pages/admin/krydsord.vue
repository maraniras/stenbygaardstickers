<script setup lang="ts">
import type { CrosswordView, CrosswordPushStatus } from '../../../shared/types/crossword'
type AdminCrosswordView = CrosswordView & { pushStatus: CrosswordPushStatus }
useHead({ title: 'Krydsord · Admin' })
const { admin, check } = useAdmin()
const view = ref<AdminCrosswordView | null>(null)
const pushMessage = computed(() => {
  const messages: Record<CrosswordPushStatus, string> = {
    development: 'Planlagte pushbeskeder sendes kun fra drift, ikke fra lokal test eller dev.',
    'not-configured':
      'Push er ikke sat op endnu: tilføj QSTASH_TOKEN i Vercel og gem tidspunktet igen.',
    unscheduled: 'Vælg et tidspunkt for at planlægge pushbeskeder.',
    scheduled:
      'Push er planlagt: én time før start og ved åbning. Hvis der var under en time til start, sendes kun åbningsbeskeden.',
    failed: 'Tidspunktet er gemt, men push kunne ikke planlægges. Prøv at gemme tidspunktet igen.',
    pending: 'Push er ikke planlagt for dette tidspunkt endnu. Gem tidspunktet igen.',
  }
  return view.value ? messages[view.value.pushStatus] : ''
})
const time = ref('')
const error = ref('')
const saved = ref(false)
const busy = ref(false)
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
    setView(await $fetch<AdminCrosswordView>('/api/admin/crossword'))
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
      title="Krydsord #1"
      back-to="/admin"
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
        <strong>Én vinder · 500 bananer + vinderbadge</strong>
        <p>
          Den første servergodkendte løsning vinder. Andre må gerne færdiggøre krydsordet uden
          præmie.
        </p>
      </div>
      <p v-if="view.winner">
        Vinder: <strong>{{ view.winner.name }}</strong>
      </p>
      <NuxtLink
        class="answer-link"
        to="/admin/krydsord-facit"
        >Vis facit →</NuxtLink
      >
      <NuxtLink
        class="preview-link"
        to="/spil/krydsord?preview=1"
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
.preview-link {
  display: block;
  margin-top: 22px;
  font-size: 13px;
  font-weight: 700;
}
.answer-link {
  display: block;
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
