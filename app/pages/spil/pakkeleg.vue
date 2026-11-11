<script setup lang="ts">
import type { ParcelView } from '../../../shared/types/parcel-game'
import { isParcelPhysical } from '../../../shared/utils/parcel-rewards'
useHead({ title: 'Pakkeleg · Stenbygaard Stickers' })
const { state, name, busy, loading, error, seconds, refresh, act, testMode, rollStage, rollDie } =
  useParcelGame()
const local = import.meta.dev
const rules = ref(false)
watch(
  () => state.value?.phase,
  (phase) => {
    rules.value = phase === 'registration'
  },
  { immediate: true },
)
const middle = computed(() => state.value?.parcels.filter((p) => !p.owner) ?? [])
const mine = computed(() => state.value?.parcels.filter((p) => p.owner === name.value) ?? [])
const unopened = computed(() => mine.value.filter((p) => !p.openedAt))
const openingId = ref<string | null>(null)
const opening = computed(() => state.value?.parcels.find((p) => p.id === openingId.value))
function canOpen(p: ParcelView['parcels'][number]) {
  return (
    state.value?.phase === 'ended' &&
    !state.value.cancelled &&
    p.owner === name.value &&
    !p.openedAt
  )
}
function summary(player: string) {
  const gifts = state.value?.parcels.filter((p) => p.owner === player && p.openedAt) ?? []
  return {
    opened: gifts.length,
    bananas: gifts.reduce((n, p) => n + (p.amount ?? 0), 0),
    physical: gifts.flatMap((p) =>
      p.reward && isParcelPhysical(p.reward) ? [p.reward.title] : [],
    ),
    frame: gifts.some((p) => p.reward?.kind === 'frame'),
  }
}
async function openGift(id: string) {
  if (busy.value) return
  openingId.value = id
  await act('open', id)
  if (!state.value?.parcels.find((p) => p.id === id)?.openedAt) openingId.value = null
  else void shootConfetti('small').catch(() => {})
}
watch(name, () => {
  openingId.value = null
})
const targets = computed(
  () =>
    new Set(
      !state.value?.pending
        ? []
        : (middle.value.length
            ? middle.value
            : state.value.parcels.filter((p) => p.owner !== name.value)
          ).map((p) => p.id),
    ),
)
const chosen = ref<string | null>(null)
const chosenParcel = computed(() => state.value?.parcels.find((p) => p.id === chosen.value))
watch(
  () => state.value?.pending?.id,
  () => {
    chosen.value = null
  },
)
</script>
<template>
  <div class="parcel-page">
    <PageHeader
      title="Pakkeleg"
      back-to="/spil/jul"
      compact
    />
    <p
      v-if="local"
      class="reset-note"
    >
      <template v-if="testMode"
        >Testbord · ingen rigtige præmier, saldoændringer eller pushbeskeder.
        <a href="/spil/pakkeleg">Til rigtig datolås</a></template
      ><a
        v-else
        href="/spil/pakkeleg?preview=1"
        >Prøv et lokalt testbord</a
      >
    </p>
    <div class="parcel-intro">
      <span>ÉT BORD · ALLE MOD ALLE</span>
      <h2>Hvem løber med gaverne?</h2>
      <p>To slag om dagen. En sekser. En pakke, der skifter hænder.</p>
    </div>
    <p
      v-if="error"
      class="error"
      role="alert"
    >
      {{ error }} <button @click="refresh">Hent bordet</button>
    </p>
    <p
      v-if="loading && !state"
      role="status"
    >
      Vi dækker julebordet…
    </p>
    <div
      v-if="state?.phase === 'archived'"
      class="status-box"
    >
      <b>Årets pakkeleg er afsluttet</b>
      <p>De 14 dage til gaveåbning er gået. Vi ses til næste pakkeleg!</p>
      <NuxtLink
        class="btn"
        to="/spil"
        >Til spil</NuxtLink
      >
    </div>
    <template v-if="state && state.phase !== 'archived'">
      <section
        v-if="state.phase === 'registration'"
        class="enrollment-card"
        aria-label="Tilmelding til pakkeleg"
      >
        <span class="enrollment-kicker">TILMELDING · 20.–26. NOVEMBER</span>
        <h2>{{ state.joined ? 'Du er med ved julebordet!' : 'Sikr dig en plads ved bordet' }}</h2>
        <p>
          {{
            state.joined
              ? 'Dine 100 bananer er betalt. Dine første to slag er klar 27. november kl. 04.00.'
              : 'Det koster 100 bananer at være med. Vi spiller fra 27. november kl. 04.00, og kun tilmeldte brugere kan tage og stjæle pakker.'
          }}
        </p>
        <NuxtLink
          v-if="!name"
          to="/mig"
          class="btn"
          >Vælg dit navn for at tilmelde dig</NuxtLink
        >
        <button
          v-else-if="!state.joined"
          class="btn"
          :disabled="busy"
          @click="act('enroll')"
        >
          {{ busy ? 'Tilmelder…' : 'Tilmeld mig · 100 🍌' }}
        </button>
        <b
          v-else
          class="enrollment-confirmed"
          >✓ Tilmeldt og betalt</b
        >
        <small
          >{{ state.players.length }} tilmeldte · Sidste frist 26. november kl. 23.59 dansk
          tid</small
        >
        <small>Mindst 4 deltagere – ellers tilbagebetales tilmeldingen.</small>
      </section>
      <div
        v-if="state.phase === 'waiting'"
        class="status-box"
      >
        <b>{{
          Date.parse(state.serverNow) < Date.parse(state.registrationStartsAt)
            ? 'Tilmeldingen åbner 20. november kl. 04.00'
            : state.joined
              ? 'Du er tilmeldt – vi starter snart!'
              : 'Tilmeldingen er lukket'
        }}</b>
        <p>
          Det koster 100 bananer at være med. Tilmelding 20.–26. november. Selve pakkelegen starter
          27. november kl. 04.00.
        </p>
      </div>
      <div
        v-else-if="state.phase === 'ended'"
        class="status-box"
      >
        <b>Pakkelegen er slut! 🎁</b>
        <p v-if="state.cancelled">
          Der var færre end fire deltagere. Pakkelegen er aflyst, og tilmeldingsgebyret er
          tilbagebetalt.
        </p>
        <template v-else
          ><p>
            Du beholdt {{ mine.length }} {{ mine.length === 1 ? 'pakke' : 'pakker' }}. Åbn dem selv
            her – indholdet er hemmeligt, indtil du åbner.
          </p>
          <p v-if="state.collectionUntil">
            Åbn senest
            {{
              new Date(state.collectionUntil).toLocaleString('da-DK', {
                dateStyle: 'long',
                timeStyle: 'short',
              })
            }}. Siden er åben i 14 dage efter slutningen.
          </p>
          <button
            v-if="unopened.length"
            class="btn open-next"
            :disabled="busy"
            @click="openGift(unopened[0]!.id)"
          >
            Åbn min næste gave · {{ unopened.length }} tilbage
          </button>
          <p v-else-if="state.joined">
            Alle dine pakker er åbnet. Se dine præmier ved din plads nedenfor.
          </p></template
        >
      </div>
      <div
        v-else-if="state.phase === 'playing'"
        class="status-box"
      >
        <b>{{
          state.pending ? `Vælg din pakke · ${seconds} sek.` : 'Gaverne er stadig på spil'
        }}</b>
        <p>
          {{
            state.pending
              ? 'Tryk på en fremhævet pakke. Ellers vælger vi automatisk.'
              : 'Legen slutter på et hemmeligt tidspunkt mellem jul og nytår.'
          }}
        </p>
      </div>
      <p
        v-if="state.phase === 'playing' && !state.joined"
        class="status-box"
      >
        Du er ikke tilmeldt årets pakkeleg, men du kan følge med ved bordet. Tilmeldingen lukkede
        26. november.
      </p>
      <section
        class="table-scene"
        aria-label="Det fælles julebord"
      >
        <div
          class="table-lights"
          aria-hidden="true"
        >
          ✦ · ✦ · ✦ · ✦ · ✦ · ✦
        </div>
        <div class="parcel-table">
          <span class="table-title">{{
            middle.length ? `${middle.length} gaver på bordet` : 'Bordet er tomt'
          }}</span>
          <div class="center-gifts">
            <button
              v-for="p in middle"
              :key="p.id"
              class="gift-button"
              :disabled="!targets.has(p.id) || busy"
              :aria-label="`Vælg pakke ${p.id.slice(1)}`"
              @click="chosen = p.id"
            >
              <ParcelPresent
                :style-index="p.style"
                :label="`#${p.id.slice(1)}`"
                :selected="targets.has(p.id)"
                :amount="p.amount"
              />
            </button>
            <p v-if="!middle.length">
              {{
                state.phase === 'ended'
                  ? 'Alle pakker er fordelt. Åbn dine ved din plads.'
                  : 'En sekser giver dig nu lov at stjæle.'
              }}
            </p>
          </div>
          <span class="table-footer">{{ state.players.length }} med ved bordet</span>
        </div>
        <div class="players">
          <article
            v-for="player in state.players"
            :key="player"
            class="player-seat"
            :class="{ me: player === name }"
          >
            <NuxtLink
              :to="`/person/${encodeURIComponent(player)}`"
              class="player-name"
              ><UserAvatar :name="player" /><b>{{ player === name ? 'Dig' : player }}</b
              ><span>{{ state.parcels.filter((p) => p.owner === player).length }}</span></NuxtLink
            >
            <div class="player-gifts">
              <template
                v-for="p in state.parcels.filter((p) => p.owner === player)"
                :key="p.id"
              >
                <ParcelRewardCard
                  v-if="p.openedAt && p.reward"
                  :reward="p.reward" />
                <button
                  v-else
                  class="gift-button"
                  :disabled="(!targets.has(p.id) && !canOpen(p)) || busy"
                  :aria-label="
                    canOpen(p)
                      ? `Åbn pakke ${p.id.slice(1)}`
                      : `Stjæl pakke ${p.id.slice(1)} fra ${player}`
                  "
                  @click="canOpen(p) ? openGift(p.id) : (chosen = p.id)"
                >
                  <ParcelPresent
                    :style-index="p.style"
                    :label="`#${p.id.slice(1)}`"
                    :selected="targets.has(p.id)"
                    :amount="p.amount"
                  /></button></template
              ><span
                v-if="!state.parcels.some((p) => p.owner === player)"
                class="no-gifts"
                >Ingen pakker. Endnu.</span
              >
            </div>
            <div
              v-if="state.phase === 'ended' && !state.cancelled"
              class="player-winnings"
            >
              <b>{{ summary(player).bananas }} 🍌</b
              ><span
                >{{ summary(player).opened }} af
                {{ state.parcels.filter((p) => p.owner === player).length }} gaver åbnet</span
              ><span v-if="summary(player).physical.length"
                >Fysiske præmier ({{ summary(player).physical.length }}):
                {{ summary(player).physical.join(', ') }}</span
              ><span v-if="summary(player).frame">Eksklusiv profilramme</span>
            </div>
          </article>
        </div>
      </section>
      <div
        v-if="state.phase === 'playing' && state.joined"
        class="dice-panel"
      >
        <NuxtLink
          v-if="!name"
          class="btn"
          to="/mig"
          >Vælg dit navn og vær med</NuxtLink
        >
        <template v-else
          ><ParcelDie
            :value="state.turn?.die ?? 1"
            :size="66"
          />
          <div>
            <b>{{ state.remaining }} af 2 slag tilbage</b
            ><span>{{
              state.turn
                ? state.turn.die === 6
                  ? state.pending
                    ? 'Sekser! Vælg en gave.'
                    : state.turn.parcel
                      ? 'Pakken er flyttet til dig!'
                      : 'Ingen pakker at tage lige nu.'
                  : `Du slog ${state.turn.die}. Kun seksere giver en pakke.`
                : 'Slå en sekser og tag en pakke.'
            }}</span>
          </div>
          <button
            class="btn"
            :disabled="busy || state.phase !== 'playing' || !!state.pending || !state.remaining"
            @click="act('roll')"
          >
            {{ busy ? 'Et øjeblik…' : 'Slå terningen' }}
          </button></template
        >
      </div>
      <p
        v-if="state.phase === 'playing' && state.joined"
        class="reset-note"
      >
        Nye slag kl. 04.00 · Ubrugte slag gemmes ikke
      </p>
      <section
        v-if="state.events.length"
        class="parcel-history"
      >
        <h3>Det sker rundt om bordet</h3>
        <p
          v-for="event in state.events.slice(0, 15)"
          :key="event.id"
        >
          <span aria-hidden="true">🎁</span
          ><span
            ><b>{{ event.to }}</b>
            {{
              event.from
                ? `stjal pakke #${event.parcel.slice(1)} fra ${event.from}`
                : `tog pakke #${event.parcel.slice(1)} fra bordet`
            }}</span
          >
        </p>
      </section>
    </template>
    <div
      v-if="openingId"
      class="pick-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Din gave"
    >
      <div class="pick-sheet">
        <ParcelRewardCard
          v-if="opening?.openedAt && opening.reward"
          :reward="opening.reward"
          large
        /><template v-else
          ><ParcelPresent
            :style-index="opening?.style ?? 0"
            label="…"
          />
          <h2>Din gave åbnes…</h2></template
        >
        <p v-if="opening?.reward && isParcelPhysical(opening.reward)">
          Du har vundet en rigtig præmie. Aftal afhentning med arrangøren.
        </p>
        <p v-if="opening?.reward?.kind === 'frame'">
          Din eksklusive juleprofilramme er sat på din profil.
        </p>
        <button
          v-if="opening?.openedAt"
          class="btn"
          @click="openingId = null"
        >
          Til mine gaver
        </button>
      </div>
    </div>
    <ParcelDiceRoll
      :stage="rollStage"
      :value="rollDie"
    />
    <button
      class="rules-toggle"
      :aria-expanded="rules"
      aria-controls="parcel-rules"
      @click="rules = !rules"
    >
      {{ rules ? 'Skjul regler' : 'Sådan spiller vi' }}
    </button>
    <button
      v-if="testMode"
      class="rules-toggle"
      :disabled="
        busy ||
        state?.phase !== 'playing' ||
        !state?.joined ||
        !!state?.pending ||
        !state?.remaining
      "
      @click="act('roll', 'six')"
    >
      Test en sekser
    </button>
    <div
      v-if="rules"
      id="parcel-rules"
      class="status-box"
    >
      <p>
        Tilmelding koster 100 bananer og er åben 20.–26. november. Kun tilmeldte brugere deltager.
        Pakkelegen starter 27. november kl. 04.00.
      </p>
      <p>
        Alle deler bordet, men spiller, når de har tid. Du har to slag pr. døgn. Kun seksere giver
        en pakke. Tag først fra midten, og stjæl derefter fra de andre.
      </p>
      <p>
        Du har 60 sekunder til at vælge. Vi vælger automatisk, hvis du går væk. Pakkerne beholder
        deres udseende, men indholdet er hemmeligt til slut. Du kan ende med nul eller flere pakker.
      </p>
      <p>
        Pakkelegen slutter på et tilfældigt, hemmeligt tidspunkt fra 25. til 31. december.
        Julekalenderens personlige gaver er ikke med i pakkelegen.
      </p>
    </div>
    <div
      v-if="chosenParcel && state?.pending"
      class="pick-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Vælg denne pakke"
    >
      <div class="pick-sheet">
        <ParcelPresent
          :style-index="chosenParcel.style"
          :label="`#${chosenParcel.id.slice(1)}`"
        />
        <h2>{{ chosenParcel.owner ? `Stjæl fra ${chosenParcel.owner}?` : 'Er det din pakke?' }}</h2>
        <p>Indholdet afsløres først, når pakkelegen er slut.</p>
        <button
          class="btn"
          :disabled="busy"
          @click="act('pick', chosenParcel.id)"
        >
          Tag pakken · {{ seconds }} sek.</button
        ><button
          :disabled="busy"
          @click="chosen = null"
        >
          Vælg en anden
        </button>
      </div>
    </div>
  </div>
</template>
<style scoped>
.open-next {
  margin-top: 14px;
  width: 100%;
}
.player-winnings {
  display: flex;
  flex-direction: column;
  gap: 5px;
  text-align: center;
  border-top: 1px solid var(--hairline);
  padding-top: 12px;
  margin-top: 12px;
  font-size: 10px;
  color: var(--muted);
}
.player-winnings > b {
  font-size: 17px;
  color: light-dark(#287343, #95d7ac);
}
.enrollment-card {
  padding: 24px;
  border: 1px solid #bd985a77;
  border-radius: 24px;
  background: linear-gradient(135deg, #284c3b, #55393f);
  color: #fff0d2;
  margin: 20px 0;
}
.enrollment-kicker {
  font-size: 10px;
  letter-spacing: 0.1em;
  font-weight: 850;
  color: #f0cd90;
}
.enrollment-card h2 {
  font-size: 24px;
  line-height: 1.25;
  margin: 12px 0;
}
.enrollment-card p {
  font-size: 13px;
  line-height: 1.7;
  color: #e2d8c6;
}
.enrollment-card .btn {
  width: 100%;
  margin-top: 10px;
  background: #f0d395;
  color: #332c20;
}
.enrollment-card small {
  display: block;
  margin-top: 16px;
  font-size: 11px;
  line-height: 1.6;
  color: #d4cbb9;
}
.enrollment-confirmed {
  display: block;
  color: #c7e5bd;
  padding-top: 12px;
}
.parcel-page {
  max-width: 700px;
  margin: 0 auto;
  padding: 16px 16px 24px;
}
.parcel-intro {
  text-align: center;
  margin: 22px 0;
}
.parcel-intro > span {
  font-size: 10px;
  letter-spacing: 0.16em;
  font-weight: 850;
  color: var(--title);
}
.parcel-intro h2 {
  font-size: 25px;
  margin: 9px 0;
}
.parcel-intro p,
.status-box p,
.reset-note {
  color: var(--muted);
  font-size: 13px;
  line-height: 1.6;
}
.status-box {
  background: var(--surface);
  border: 1px solid var(--hairline);
  border-radius: 17px;
  padding: 15px;
  margin: 16px 0;
}
.status-box p {
  margin: 5px 0 0;
}
.table-scene {
  position: relative;
  padding-top: 10px;
}
.table-lights {
  text-align: center;
  color: #daa85d;
  letter-spacing: 10px;
  font-size: 17px;
  margin-bottom: 5px;
}
.parcel-table {
  min-height: 240px;
  border-radius: 40% / 18%;
  border: 11px solid #79503a;
  background: radial-gradient(ellipse, #3d7967, #184a3b);
  box-shadow:
    inset 0 0 0 3px #ddbd7245,
    inset 0 12px 35px #0005,
    0 12px 20px #0002;
  text-align: center;
  padding: 22px 12px 18px;
  color: #fff2d2;
}
.table-title,
.table-footer {
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-weight: 800;
  opacity: 0.8;
}
.center-gifts {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: flex-end;
  gap: 30px 20px;
  min-height: 130px;
  padding: 34px 0 18px;
}
.center-gifts p {
  font-size: 12px;
  color: #e4e6d4;
}
.gift-button {
  background: none;
  border: 0;
  padding: 7px;
  cursor: pointer;
  touch-action: manipulation;
  transition: transform 0.2s;
}
.gift-button:disabled {
  opacity: 1;
  cursor: default;
}
.gift-button:not(:disabled):hover {
  transform: translateY(-5px);
}
.gift-button:focus-visible {
  outline: 3px solid #efd08a;
  border-radius: 8px;
}
.players {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  align-items: start;
  gap: 12px;
  margin: 22px 0;
}
.player-seat {
  background: var(--surface);
  border: 1px solid var(--hairline);
  border-radius: 18px;
  padding: 12px;
  min-width: 0;
}
.player-seat.me {
  border-color: #b8934b;
}
.player-name {
  display: flex;
  align-items: center;
  gap: 7px;
  text-decoration: none;
  color: inherit;
  min-width: 0;
}
.player-name :deep(.user-avatar) {
  width: 29px;
  height: 29px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: var(--surface-2);
  font-size: 11px;
}
.player-name b {
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.player-name > span:last-child {
  margin-left: auto;
  font-size: 11px;
  color: var(--muted);
}
.player-gifts {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
  align-items: flex-end;
  padding-top: 33px;
  min-height: 70px;
}
.no-gifts {
  font-size: 11px;
  color: var(--muted);
  padding-bottom: 15px;
}
.player-gifts :deep(.present) {
  --parcel-scale: 0.72;
}
.player-gifts :deep(.bow) {
  top: -23px;
  transform: scale(0.85);
}
.dice-panel {
  position: sticky;
  bottom: 8px;
  z-index: 5;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 18px 16px;
  min-height: 112px;
  flex-wrap: wrap;
  border-radius: 20px;
  background: var(--surface);
  border: 1px solid var(--hairline);
  box-shadow: 0 6px 30px #0002;
}
.dice-panel > div {
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
}
.dice-panel b {
  font-size: 15px;
}
.dice-panel div > span {
  font-size: 11px;
  color: var(--muted);
  line-height: 1.4;
}
.dice-panel .btn {
  min-width: 110px;
  min-height: 48px;
  flex: 1 0 100%;
}
.reset-note {
  text-align: center;
  font-size: 11px;
}
.parcel-history {
  margin-top: 26px;
}
.parcel-history h3 {
  font-size: 15px;
}
.parcel-history p {
  display: flex;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid var(--hairline);
  font-size: 12px;
  line-height: 1.5;
}
.rules-toggle {
  display: block;
  margin: 20px auto 0;
  background: none;
  color: var(--muted);
  font-size: 12px;
  border: 0;
  text-decoration: underline;
}
.pick-overlay {
  position: fixed;
  inset: 0;
  background: #0009;
  z-index: 1500;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 20px;
}
.pick-sheet {
  width: 100%;
  max-width: 420px;
  padding: 55px 24px 24px;
  border-radius: 24px;
  background: var(--surface);
  text-align: center;
  box-shadow: 0 15px 50px #0005;
}
.pick-sheet h2 {
  font-size: 23px;
  margin-top: 28px;
}
.pick-sheet p {
  color: var(--muted);
  font-size: 13px;
}
.pick-sheet button {
  display: block;
  width: 100%;
  margin-top: 14px;
}
.pick-sheet > button:last-child:not(.btn) {
  background: none;
  color: var(--muted);
  border: 0;
  padding: 8px;
}
@media (min-width: 480px) {
  .players {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (min-width: 680px) {
  .players {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
@media (prefers-reduced-motion: reduce) {
  .gift-button {
    transition: none;
  }
}
</style>
