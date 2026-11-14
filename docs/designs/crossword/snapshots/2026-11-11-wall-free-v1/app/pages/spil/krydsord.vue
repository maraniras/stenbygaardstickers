<script setup lang="ts">
useHead({ title: 'Kryds & tværs · Stenbygaard Stickers' })
const preview = useRoute().query.preview === '1'
const { view, pending, error, reload, submit } = useCrossword(preview)
const { name } = useUser()
const { reload: reloadWallet, reloadPeople } = useEconomy()
watch([() => view.value?.winner?.at, name], () => {
  if (!preview && view.value?.winner && view.value.winner.name === name.value)
    void Promise.allSettled([reloadWallet(), reloadPeople()])
})
const opening = computed(() =>
  view.value?.opensAt
    ? new Date(view.value.opensAt).toLocaleString('da-DK', {
        timeZone: 'Europe/Copenhagen',
        dateStyle: 'long',
        timeStyle: 'short',
      })
    : '',
)
</script>
<template>
  <div
    v-if="view?.puzzle"
    class="crossword-game"
  >
    <p
      v-if="view.preview"
      class="competition-banner"
    >
      Admin-preview · Ingen præmier eller konkurrence
    </p>
    <div
      v-else-if="view.winner"
      class="competition-banner"
      role="status"
    >
      <strong
        ><NuxtLink :to="'/person/' + encodeURIComponent(view.winner.name)">{{
          view.winner.name
        }}</NuxtLink>
        vandt kryds &amp; tværs #1</strong
      >
      <span>500 bananer og vinderbadgen er uddelt. Du kan stadig løse krydsordet.</span>
    </div>
    <p
      v-else
      class="competition-banner"
    >
      Første korrekte løsning vinder 500 bananer og vinderbadgen.
      <NuxtLink
        v-if="!name"
        to="/mig"
        >Vælg dit navn for at deltage.</NuxtLink
      >
    </p>
    <CrosswordBoard
      :key="
        view.id +
        ':' +
        view.puzzle.columns +
        'x' +
        view.puzzle.rows +
        ':' +
        view.puzzle.entries.length +
        ':' +
        (name || 'anonym') +
        ':' +
        preview
      "
      :puzzle="view.puzzle"
      :puzzle-id="view.id"
      :owner="name || 'anonym'"
      :preview="view.preview"
      :check-answers="submit"
    />
  </div>
  <div
    v-else
    class="locked-page"
  >
    <PageHeader
      title="Kryds &amp; tværs"
      back-to="/spil/oevrige"
    />
    <section class="locked-card">
      <span class="eyebrow">KRYDSORD #1</span>
      <h2>{{ pending ? 'Henter krydsordet…' : 'Krydsordet er ikke åbnet endnu' }}</h2>
      <p v-if="error">{{ error }}</p>
      <p v-else>
        {{
          opening ? 'Åbner ' + opening + ' (dansk tid).' : 'Åbningstidspunktet annonceres senere.'
        }}
      </p>
      <p>Den første korrekte løsning vinder 500 bananer og en særlig badge.</p>
      <button
        v-if="error"
        type="button"
        class="btn"
        @click="reload"
      >
        Prøv igen
      </button>
      <NuxtLink to="/spil/oevrige">Tilbage til Øvrige spil →</NuxtLink>
    </section>
  </div>
</template>
<style scoped>
.crossword-game {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}
.crossword-game :deep(.crossword-page) {
  flex: 1;
  width: 100%;
}
.competition-banner {
  flex: none;
  margin: 6px auto 0;
  padding: 8px 12px;
  width: min(100%, 560px);
  background: var(--accent-soft);
  color: var(--text);
  font-size: 11px;
  line-height: 1.45;
}
.competition-banner strong,
.competition-banner span {
  display: block;
}
.competition-banner a {
  text-decoration: none;
}
.locked-page {
  max-width: 480px;
  margin: 0 auto;
  padding: calc(20px + var(--safe-t)) 16px 20px;
}
.locked-card {
  padding: 26px;
  border: 1px solid var(--hairline);
  border-radius: 24px;
  background: var(--surface);
}
h2 {
  font-size: 25px;
  margin: 12px 0;
}
p {
  color: var(--muted);
  font-size: 14px;
  line-height: 1.6;
}
.eyebrow {
  color: var(--muted);
  font-size: 11px;
  letter-spacing: 0.08em;
  font-weight: 800;
}
.locked-card a {
  display: inline-block;
  margin-top: 14px;
  font-size: 13px;
  font-weight: 700;
}
</style>
