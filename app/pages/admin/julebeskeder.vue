<script setup lang="ts">
import type { SeasonalPushJob } from '../../../server/data/seasonal-push'
type Status = {
  status: string
  jobs: (SeasonalPushJob & { status: string })[]
  tableEmptySentAt: string | null
}
const { admin, check } = useAdmin()
const view = ref<Status | null>(null)
const error = ref('')
const busy = ref(false)
useHead({ title: 'Julebeskeder · Admin' })
const audience = {
  all: 'Alle',
  joined: 'Kun tilmeldte',
  'not-joined': 'Kun ikke tilmeldte',
  'unused-rolls': 'Kun deltagere med ubrugte slag · sendes kun mens spillet er i gang',
}
const labels: Record<string, string> = {
  pending: 'Afventer planlægning',
  queued: 'Planlagt',
  sent: 'Afsendt',
  expired: 'Tidspunkt passeret',
}
const date = (at: string) =>
  new Date(at).toLocaleString('da-DK', {
    timeZone: 'Europe/Copenhagen',
    dateStyle: 'medium',
    timeStyle: 'short',
  })
async function load(schedule = false) {
  busy.value = true
  error.value = ''
  try {
    view.value = await $fetch<Status>('/api/admin/seasonal-push', {
      method: schedule ? 'POST' : 'GET',
    })
  } catch {
    error.value = 'Kunne ikke hente eller planlægge beskederne. Prøv igen.'
  } finally {
    busy.value = false
  }
}
onMounted(async () => {
  if (await check()) await load()
})
</script>
<template>
  <div class="page">
    <PageHeader
      title="Julebeskeder"
      back-to="/admin"
      back-label="Tilbage til admin"
    />
    <div
      v-if="admin && view"
      class="messages"
    >
      <p>
        Alle tidspunkter er dansk tid. Tobias Frost er undtaget fra alle disse beskeder. Brugernes
        notifikationsvalg respekteres.
      </p>
      <p v-if="view.status === 'development'">
        Lokal test og dev sender eller planlægger ingen beskeder. De planlægges automatisk, når
        opdateringen er på drift.
      </p>
      <p
        v-else-if="view.status === 'not-configured'"
        class="err"
      >
        Tidsbestemte beskeder kræver QSTASH_TOKEN i Vercel på drift. Tilføj den, genudgiv og
        kontrollér planen her.
      </p>
      <button
        class="chip"
        :disabled="busy"
        @click="load(view.status === 'ready')"
      >
        {{ busy ? 'Henter…' : 'Kontrollér plan' }}
      </button>
      <article
        v-for="job in view.jobs"
        :key="job.id"
        class="message"
      >
        <div class="eyebrow">{{ date(job.at) }} · {{ labels[job.status] }}</div>
        <h2>{{ job.title }}</h2>
        <p>{{ job.body }}</p>
        <small>{{ audience[job.audience] }} · <NuxtLink :to="job.url">Åbn siden</NuxtLink></small>
      </article>
      <article class="message">
        <div class="eyebrow">
          Når den sidste pakke tages · {{ view.tableEmptySentAt ? 'Afsendt' : 'Afventer' }}
        </div>
        <h2>Alle pakker er taget fra bordet</h2>
        <p>Nu er det tid til at stjæle.</p>
        <small>Alle · <NuxtLink to="/spil/pakkeleg">Åbn pakkelegen</NuxtLink></small>
      </article>
    </div>
    <p
      v-if="error"
      class="err"
      role="alert"
    >
      {{ error }}
    </p>
    <NuxtLink
      v-if="admin === false"
      to="/admin"
      >Log ind som admin</NuxtLink
    >
  </div>
</template>
<style scoped>
.messages {
  display: grid;
  gap: 16px;
}
.message {
  padding: 18px;
  border-radius: 20px;
  background: var(--surface);
  border: 1px solid var(--hairline);
}
h2 {
  font-size: 1.05rem;
  margin: 10px 0;
}
p {
  line-height: 1.5;
}
.chip {
  justify-self: start;
}
</style>
