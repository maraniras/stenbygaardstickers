<script setup lang="ts">
useHead({ title: 'Julespil · Stenbygaard Stickers' })
const { state } = useEconomy()
const { now: calendarNow, season, parcelDates, parcelCampaign } = useChristmasGames()
const calendarLink = resolveComponent('NuxtLink')
const calendarVisible = computed(() => season.value.calendar)
const calendarSeason = computed(() => ({ open: season.value.calendarOpen }))
const calendarOpen = computed(() => import.meta.dev || season.value.calendarOpen)
const parcelVisible = computed(() => season.value.parcels)
const boxesDone = computed(() => Boolean(state.value?.boxes))
</script>
<template>
  <div class="christmas-page">
    <PageHeader
      title="Spil"
      description="Julehygge, nisser og gaver, der skifter hænder."
    >
      <template #actions
        ><NuxtLink
          v-if="state"
          class="page-balance"
          to="/spil/bananer"
          aria-label="Åbn dit bananlager"
          >🍌 {{ state.wallet.balance.toLocaleString('da-DK') }}</NuxtLink
        ></template
      >
    </PageHeader>
    <GameSectionNav
      section="christmas"
      :christmas-visible="season.visible"
    />
    <p
      v-if="!season.visible"
      class="season-closed"
    >
      Julespillene er pakket væk for denne gang. Vi ses til næste jul!
    </p>
    <template v-else>
      <NuxtLink
        v-if="parcelVisible"
        class="parcel-teaser"
        to="/spil/pakkeleg"
        ><span aria-hidden="true">🎁 🎲</span>
        <div>
          <small>TO SLAG · ÉT FÆLLES BORD</small>
          <h2>Pakkeleg</h2>
          <p>
            {{
              calendarNow.getTime() < Date.parse(parcelDates.startsAt)
                ? 'Tilmeld dig 20.–26. november for 100 bananer. Vi starter 27. november.'
                : 'Slå en sekser. Snup en gave. Stol på ingen.'
            }}
          </p>
          <b>{{
            parcelCampaign?.phase === 'ended'
              ? 'Åbn dine gaver →'
              : parcelDates.registrationOpen
                ? 'Tilmeld dig · 100 🍌 →'
                : calendarNow.getTime() < Date.parse(parcelDates.registrationStartsAt)
                  ? 'Tilmelding åbner 20. november →'
                  : 'Se julebordet →'
          }}</b>
        </div></NuxtLink
      >
      <component
        :is="calendarOpen ? calendarLink : 'div'"
        v-if="calendarVisible"
        class="advent-link"
        :to="calendarOpen ? '/spil/julekalender' : undefined"
        :aria-disabled="!calendarOpen || undefined"
      >
        <div>
          <span>ET KIG PÅ DECEMBER</span>
          <h2>Julekalender</h2>
          <p>24 låger. Lidt magi hver dag.</p>
        </div>
        <span
          class="advent-link-day"
          aria-hidden="true"
          >24</span
        >
        <span class="advent-link-cta"
          >{{ calendarSeason.open ? 'Åbn kalenderen' : 'Åbner 1. december' }}
          <span
            v-if="calendarOpen"
            aria-hidden="true"
            >→</span
          ></span
        >
      </component>
      <NuxtLink
        v-if="season.boxes"
        class="boxes-card game-card"
        to="/spil/bokse"
        aria-label="Dagens bokse"
      >
        <div class="boxes-card-copy">
          <span class="boxes-kicker">12 BOKSE · 3 VALG</span>
          <h2>Dagens bokse</h2>
          <p>
            {{
              !season.boxesOpen
                ? 'Et dagligt julespil fra 20. november til 31. december.'
                : boxesDone
                  ? `Dagens resultat: ${state!.boxes!.amount > 0 ? '+' : state!.boxes!.amount < 0 ? '−' : ''}${Math.abs(state!.boxes!.amount)} 🍌`
                  : 'Vælg tre. Find bananer, drillenisser eller Miv.'
            }}
          </p>
          <span class="game-link"
            >{{
              !season.boxesOpen
                ? 'Åbner 20. november'
                : boxesDone
                  ? 'Se resultat'
                  : 'Vælg dine bokse'
            }}
            <span aria-hidden="true">→</span></span
          >
        </div>
        <div
          class="mini-boxes"
          aria-hidden="true"
        >
          <i
            v-for="n in 12"
            :key="n"
            :class="{ picked: [2, 6, 10].includes(n) }"
            >{{ [2, 6, 10].includes(n) ? '✦' : '?' }}</i
          >
        </div>
      </NuxtLink>
    </template>
  </div>
</template>
<style scoped>
.parcel-teaser {
  display: flex;
  gap: 20px;
  align-items: center;
  background: linear-gradient(120deg, #254e40, #6a343e);
  color: #fff0d5;
  border: 1px solid #d2ad6255;
  border-radius: 24px;
  padding: 24px;
  margin: 18px 0;
  text-decoration: none;
}
.parcel-teaser > span {
  font-size: 34px;
}
.parcel-teaser small {
  font-size: 9px;
  letter-spacing: 0.12em;
}
.parcel-teaser h2 {
  margin: 7px 0;
  font-size: 26px;
}
.parcel-teaser p {
  font-size: 12px;
  line-height: 1.5;
  opacity: 0.8;
}
.parcel-teaser b {
  font-size: 12px;
}
.advent-link,
.game-card {
  margin-bottom: 16px;
}
.game-card.boxes-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 20px;
  background: linear-gradient(125deg, var(--surface), var(--surface-2));
}
.boxes-card-copy {
  min-width: 0;
  flex: 1;
}
.boxes-kicker {
  font-size: 8px;
  letter-spacing: 0.15em;
  font-weight: 800;
  color: var(--muted);
}
.boxes-card h2 {
  margin-top: 7px;
  font-size: 23px;
}
.boxes-card p {
  margin: 8px 0 14px;
  font-size: 12px;
  color: var(--muted);
  line-height: 1.5;
}
.mini-boxes {
  flex: none;
  width: 100px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
  transform: rotate(7deg);
}
.mini-boxes i {
  aspect-ratio: 1;
  display: grid;
  place-items: center;
  border: 1px solid #9aaf9a55;
  border-radius: 7px;
  background: #304b3f;
  color: #eee2bd66;
  font-style: normal;
  font-family: Georgia, serif;
  font-size: 18px;
}
.mini-boxes .picked {
  color: #49371c;
  background: #dfc180;
  border-color: #edda9e;
  box-shadow: 0 2px 8px #9d7e3422;
}
.advent-link {
  position: relative;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 16px;
  padding: 20px;
  overflow: hidden;
  border: 1px solid #c8ae775c;
  border-radius: 22px;
  background:
    linear-gradient(90deg, #163d371a, #163d37ee),
    url('/images/christmas-calendar-final-v3.webp') center 40% / cover;
  color: #fff0cb;
  text-decoration: none;
}
.advent-link > div {
  grid-column: 2;
  grid-row: 1;
  text-align: right;
}
.advent-link div > span {
  font-size: 8px;
  letter-spacing: 0.17em;
  font-weight: 700;
}
.advent-link h2 {
  margin-top: 5px;
  font-family: Georgia, serif;
  font-size: clamp(24px, 7vw, 28px);
  font-weight: 400;
  letter-spacing: -0.02em;
}
.advent-link p {
  margin: 5px 0 0;
  font-size: 11px;
  color: #eee4c9;
}
.advent-link-day {
  grid-column: 1;
  grid-row: 1;
  align-self: center;
  display: grid;
  place-items: center;
  width: 59px;
  height: 72px;
  border: 1px dashed #e7cb8c80;
  border-radius: 6px;
  background: #ffffff08;
  font-family: Georgia, serif;
  font-size: 32px;
  transform: rotate(8deg);
}
.advent-link-cta {
  grid-column: 2;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  font-size: 11px;
  font-weight: 700;
}

.game-card {
  display: block;
  color: var(--text);
  text-decoration: none;
  overflow: hidden;
  border-radius: 24px;
  background: var(--surface);
  box-shadow:
    var(--shadow-sm),
    inset 0 0 0 1px var(--hairline);
}
h2 {
  font-size: 23px;
  letter-spacing: -0.04em;
}
.game-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  color: var(--text);
  font-size: 13px;
  font-weight: 800;
  text-decoration: none;
}
.game-link span {
  font-size: 20px;
}
.christmas-page {
  max-width: 480px;
  margin: 0 auto;
  padding: calc(20px + var(--safe-t)) 16px 18px;
}
.season-closed {
  color: var(--muted);
  line-height: 1.6;
}
a:focus-visible {
  outline: 2px solid var(--text);
  outline-offset: 3px;
}
</style>
