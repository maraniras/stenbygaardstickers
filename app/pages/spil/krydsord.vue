<script setup lang="ts">
definePageMeta({ key: (route) => route.fullPath })
import { CROSSWORDS, isCrosswordId } from '../../../shared/utils/crosswords'
useHead({ title: 'På Tværs · Stenbygaard Stickers' })
const route = useRoute()
const puzzleId = isCrosswordId(route.query.id) ? route.query.id : '1'
const preview = route.query.preview === '1'
const marvel = puzzleId === 'marvel'
const { view, pending, error, reload, submit, checkHelp, buyLetter } = useCrossword(
  preview,
  puzzleId,
)
const { name } = useUser()
const showLeaderboard = ref(false)
const { reload: reloadWallet, reloadPeople } = useEconomy()
const { reload: reloadUsers } = useUsers()
watch([() => view.value?.completed, name], () => {
  if (!preview && view.value?.completed)
    void Promise.allSettled([reloadWallet(), reloadPeople(), reloadUsers()])
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
    <div
      v-if="view.winner && !view.preview"
      class="competition-banner"
      role="status"
    >
      <strong
        ><NuxtLink :to="'/person/' + encodeURIComponent(view.winner.name)">{{
          view.winner.name
        }}</NuxtLink>
        vandt {{ view.title }}</strong
      >
      <span>{{
        puzzleId === '2'
          ? view.winner.name === name
            ? 'Du har vundet 1.000 bananer!'
            : 'Vinderen har fået 1.000 bananer. Du får 50 bananer, når du løser krydsordet.'
          : view.winner.name === name
            ? marvel
              ? 'Du har vundet 500 bananer, vinderbadgen samt den eksklusive profilramme og profilbanneret! Vælg ramme og banner under dine indstillinger.'
              : 'Du har vundet RTA-koppen, 1.000 bananer, vinderbadgen samt en eksklusiv profilramme og et profilbanner! Vælg ramme og banner under dine indstillinger. Kontakt Mathias om udlevering af koppen.'
            : marvel
              ? 'Vinderen har fået 500 bananer, badgen, profilrammen og profilbanneret. Du får 50 bananer, når du løser krydsordet.'
              : 'RTA-koppen, 1.000 bananer, vinderbadgen, profilrammen og profilbanneret er vundet. Du kan stadig løse krydsordet.'
      }}</span>
    </div>
    <p
      v-if="view.completionPrize && view.completed && view.winner?.name !== name && !view.preview"
      class="competition-banner"
      role="status"
    >
      Du har løst {{ view.title }} og fået {{ view.completionPrize }} bananer.
    </p>
    <CrosswordBoard
      :key="view.id + ':' + view.puzzle.revision + ':' + (name || 'anonym') + ':' + preview"
      :title="view.title"
      :puzzle="view.puzzle"
      :puzzle-id="view.id"
      :owner="name || 'anonym'"
      :preview="view.preview"
      :check-answers="submit"
      :help-at="view.helpAt"
      :help-available="view.helpAvailable"
      :completed="view.completed"
      :check-help="checkHelp"
      :letter-shop="view.letterShop"
      :buy-letter="buyLetter"
    >
      <template #actions>
        <button
          class="leaderboard-trigger"
          type="button"
          title="Rangliste"
          aria-label="Vis rangliste"
          @click="showLeaderboard = true"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M3 20v-7h5v7m0 0V7h8v13m0 0V11h5v9M2 20h20"
              stroke="currentColor"
              stroke-width="1.7"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="m12 2 .6 1.2 1.4.2-1 1 .2 1.4-1.2-.7-1.2.7.2-1.4-1-1 1.4-.2Z"
              fill="currentColor"
            />
          </svg>
        </button>
      </template>
    </CrosswordBoard>
    <CrosswordLeaderboard
      v-if="showLeaderboard"
      :preview="view.preview"
      :puzzle-id="puzzleId"
      @close="showLeaderboard = false"
    />
  </div>
  <div
    v-else
    class="locked-page"
  >
    <PageHeader
      :title="CROSSWORDS[puzzleId].title"
      back-to="/spil/oevrige"
    />
    <section class="locked-card">
      <span class="eyebrow">{{ CROSSWORDS[puzzleId].title }}</span>
      <h2>{{ pending ? 'Henter krydsordet…' : 'Krydsordet er ikke åbnet endnu' }}</h2>
      <p v-if="error">{{ error }}</p>
      <p v-else>
        {{
          opening ? 'Åbner ' + opening + ' (dansk tid).' : 'Åbningstidspunktet annonceres senere.'
        }}
      </p>
      <p>Den første korrekte løsning vinder:</p>
      <CrosswordPrize :puzzle-id="puzzleId" />
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
.leaderboard-trigger {
  display: grid;
  place-items: center;
  flex: none;
  width: 34px;
  height: 34px;
  border: 1px solid var(--hairline);
  border-radius: 10px;
  color: var(--muted);
  background: var(--surface-2);
}
.leaderboard-trigger svg {
  width: 20px;
  height: 20px;
}
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
