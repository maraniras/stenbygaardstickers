<script setup lang="ts">
import { ROULETTE_CHIPS, rouletteColour, rouletteSpotLabel } from '../../../shared/utils/roulette'
import type { RouletteNumber } from '../../../shared/types/roulette'

useHead({ title: 'Roulette · Stenbygaard Stickers' })
const { name } = useUser()
const {
  view,
  phase,
  seconds,
  result,
  wheelResult,
  wheelRound,
  landing,
  settled,
  last,
  fresh,
  canEdit,
  busy,
  loading,
  error,
  acknowledgment,
  uncertain,
  canUndo,
  refresh,
  add,
  undo,
  clear,
  retry,
} = useRoulette()
const chip = ref<number>(5)
const outside = ['low', 'even', 'odd', 'high']
const numbers = Array.from({ length: 36 }, (_, i) => String(i + 1) as RouletteNumber)
const status = computed(() =>
  landing.value
    ? 'Hjulet lander…'
    : {
        loading: 'Henter fælles bord…',
        betting: 'Bordet er åbent',
        spinning: 'Ikke flere indsatser',
        result: result.value === undefined ? 'Afventer resultatet…' : 'Resultatet er klar',
        waiting: 'Venter på næste runde…',
      }[phase.value],
)
const amounts = computed(() =>
  Object.fromEntries((view.value?.me?.bets ?? []).map((b) => [b.spot, b.amount])),
)
const recent = computed(() => {
  const previous = (view.value?.recent ?? []).filter((r) => r.round < (view.value?.round.id ?? 0))
  return result.value !== undefined && view.value
    ? [{ round: view.value.round.id, number: result.value }, ...previous].slice(0, 10)
    : previous.slice(0, 10)
})
const latest = computed(() =>
  result.value !== undefined && view.value
    ? { round: view.value.round.id, number: result.value }
    : recent.value[0],
)
const bettors = computed(() => {
  const bySpot: Record<string, { name: string; amount: number }[]> = {}
  const me = name.value
  const players = (view.value?.players ?? []).filter((player) => !me || !sameName(player.name, me))
  const entries =
    me && view.value?.me ? [{ name: me, bets: view.value.me.bets }, ...players] : players
  for (const player of entries)
    for (const bet of player.bets)
      (bySpot[bet.spot] ??= []).push({ name: player.name, amount: bet.amount })
  return bySpot
})
const rolling = computed(
  () =>
    !landing.value &&
    (phase.value === 'spinning' || (phase.value === 'result' && wheelResult.value === undefined)),
)
const sound = useRouletteSound(computed(() => rolling.value || landing.value))
function landed(round: number) {
  if (landing.value && wheelRound.value === round) sound.land()
  settled(round)
}
function unlockSound(event: Event) {
  if (!(event.target instanceof Element && event.target.closest('[data-roulette-sound]')))
    sound.unlock()
}
function canAdd(spot: string) {
  const me = view.value?.me
  return (
    canEdit.value &&
    Boolean(
      me &&
      me.balance !== undefined &&
      me.limit &&
      me.total + chip.value <= 50 &&
      (amounts.value[spot] ?? 0) + chip.value <= 50 &&
      chip.value <= me.balance &&
      chip.value <= me.limit.remaining,
    )
  )
}
function label(spot: string) {
  return `${rouletteSpotLabel(spot)}: ${amounts.value[spot] ?? 0} bananer bekræftet. Tilføj ${chip.value} bananer${bettors.value[spot]?.length ? `. ${bettors.value[spot]!.length} spillere har indsatser her` : ''}`
}
</script>

<template>
  <div
    class="roulette-page"
    @pointerdown.capture="unlockSound"
    @keydown.capture="unlockSound"
  >
    <PageHeader
      title="Roulette"
      back-to="/spil/casino"
    >
      <template #actions>
        <NuxtLink
          v-if="view?.me?.balance !== undefined"
          class="page-balance"
          to="/spil/bananer"
          aria-label="Åbn dit bananlager"
          >🍌 {{ view.me.balance.toLocaleString('da-DK') }}</NuxtLink
        >
      </template>
    </PageHeader>

    <section
      class="felt"
      aria-label="Fælles roulettebord"
    >
      <div class="table-heading">
        <span>AMERIKANSK · 0 + 00</span
        ><span
          v-if="view"
          :title="`Runde ${view.round.id}`"
          >Runde kl. {{ rouletteRoundTime(view.round.id) }}</span
        >
      </div>
      <div
        class="round-state"
        role="status"
      >
        <strong>{{ status }}</strong>
        <span
          v-if="view"
          class="countdown"
          >{{ seconds }}<small>sek.</small></span
        >
      </div>
      <p class="phase-copy">
        {{
          landing
            ? 'Et øjeblik… Resultat og saldo vises, når hjulet er landet.'
            : phase === 'betting'
              ? 'Læg dine chips, før bordet lukker.'
              : phase === 'spinning'
                ? 'Hjulet drejer. Alle indsatser er låst.'
                : phase === 'result'
                  ? 'Næste runde åbner om et øjeblik.'
                  : 'Vi synkroniserer med bordet.'
        }}
      </p>
      <RouletteWheel
        :spinning="rolling"
        :result="wheelResult"
        :round="wheelRound"
        @settled="landed"
        @tick="sound.tick"
      />
      <div
        class="result-strip"
        aria-live="polite"
        aria-atomic="true"
      >
        <template v-if="latest">
          <span
            class="result-number"
            :class="rouletteColour(latest.number)"
            >{{ latest.number }}</span
          >
          <span
            ><b>{{ result !== undefined ? 'Vindertal' : 'Seneste resultat' }}</b
            ><small
              >Runde kl. {{ rouletteRoundTime(latest.round) }} ·
              {{
                rouletteColour(latest.number) === 'red'
                  ? 'Rød'
                  : rouletteColour(latest.number) === 'black'
                    ? 'Sort'
                    : 'Grøn'
              }}</small
            ></span
          >
        </template>
        <span v-else>Første resultat kommer snart.</span>
      </div>
      <ol
        v-if="recent.length"
        class="recent-results"
        aria-label="Seneste 10 resultater, nyeste først"
      >
        <li
          v-for="entry in recent"
          :key="entry.round"
          :class="rouletteColour(entry.number)"
          :title="`Kl. ${rouletteRoundTime(entry.round)}: ${entry.number}`"
          :aria-label="`${entry.number}, klokken ${rouletteRoundTime(entry.round)}`"
        >
          {{ entry.number }}
        </li>
      </ol>
    </section>

    <section
      v-if="last"
      class="receipt"
      aria-label="Din senest afgjorte runde"
    >
      <div>
        <span
          >Din afgjorte runde kl. {{ rouletteRoundTime(last.round) }} · tal {{ last.number }}</span
        ><strong :class="{ positive: last.net > 0 }"
          >{{ last.net > 0 ? '+' : '' }}{{ last.net.toLocaleString('da-DK') }} 🍌 netto</strong
        >
      </div>
      <p>Indsat {{ last.stake }} 🍌 · Udbetalt {{ last.payout }} 🍌</p>
    </section>

    <div
      v-if="!name"
      class="notice"
    >
      <b>Du er med som tilskuer</b>
      <p>
        Se hjulet og alles indsatser. <NuxtLink to="/mig">Vælg dit navn</NuxtLink> for at spille
        med.
      </p>
    </div>
    <div
      v-if="error"
      class="notice error"
      role="alert"
    >
      <p>{{ error }}</p>
      <p v-if="uncertain">
        Afventer bekræftelse · runde kl. {{ rouletteRoundTime(uncertain.round) }}:
        {{
          uncertain.bets.length
            ? uncertain.bets.map((b) => `${rouletteSpotLabel(b.spot)}: ${b.amount} 🍌`).join(' · ')
            : 'Fjern alle indsatser'
        }}
      </p>
      <button
        v-if="uncertain"
        :disabled="busy"
        @click="retry"
      >
        {{ busy ? 'Afventer server…' : 'Genforsøg samme anmodning' }}</button
      ><button
        v-else
        :disabled="loading || busy"
        @click="refresh"
      >
        {{ loading ? 'Opdaterer…' : 'Opdatér bordet' }}
      </button>
    </div>
    <p
      v-if="view && !fresh"
      class="connection"
      role="status"
    >
      Bordet er ikke opdateret. Indsatser er sat på pause, indtil forbindelsen er tilbage.
    </p>

    <section
      class="betting-panel"
      aria-labelledby="bets-title"
      :aria-busy="busy"
    >
      <div class="section-heading">
        <h2 id="bets-title">Dine indsatser</h2>
        <b>{{ view?.me?.total ?? 0 }} / 50 🍌</b>
      </div>
      <p class="muted">5–50 🍌 pr. felt · højst 50 🍌 i alt pr. runde</p>
      <div
        class="chip-controls"
        role="group"
        aria-label="Vælg chipværdi"
      >
        <button
          v-for="value in ROULETTE_CHIPS"
          :key="value"
          :aria-pressed="chip === value"
          :class="{ selected: chip === value }"
          @click="chip = value"
        >
          {{ value }}<small>🍌</small>
        </button>
        <span>Vælg chip,<br />tryk på et felt</span>
      </div>
      <p
        class="save-status"
        role="status"
      >
        {{
          busy
            ? 'Sender ændring… De viste indsatser er stadig de senest bekræftede.'
            : uncertain
              ? 'Ændringen er uafklaret. De viste indsatser er senest hentet fra serveren.'
              : acknowledgment ||
                (view?.me?.total
                  ? 'Alle viste indsatser er bekræftet af serveren.'
                  : 'Ingen indsats bekræftet i denne runde.')
        }}
      </p>
      <div
        class="bet-board"
        role="group"
        aria-label="Roulettebord: vælg felt til din indsats"
      >
        <div
          class="colour-grid"
          role="group"
          aria-label="Rød eller sort"
        >
          <button
            v-for="spot in ['red', 'black'] as const"
            :key="spot"
            :class="[spot, { staked: amounts[spot] }]"
            :disabled="!canAdd(spot)"
            :aria-label="label(spot)"
            @click="add(spot, chip)"
          >
            {{ rouletteSpotLabel(spot)
            }}<small>{{ amounts[spot] ? `${amounts[spot]} 🍌` : '2×' }}</small>
            <RouletteBetMarkers :people="bettors[spot] ?? []" />
          </button>
        </div>
        <button
          class="green green-bet"
          :class="{ staked: amounts.green }"
          :disabled="!canAdd('green')"
          :aria-label="label('green')"
          @click="add('green', chip)"
        >
          Grøn · 0 + 00
          <small>{{ amounts.green ? `${amounts.green} 🍌` : '18×' }}</small>
          <RouletteBetMarkers :people="bettors.green ?? []" />
        </button>
        <div class="outside-grid">
          <button
            v-for="spot in outside"
            :key="spot"
            :class="[spot, { staked: amounts[spot] }]"
            :disabled="!canAdd(spot)"
            :aria-label="label(spot)"
            @click="add(spot, chip)"
          >
            {{ rouletteSpotLabel(spot)
            }}<small>{{ amounts[spot] ? `${amounts[spot]} 🍌` : '2×' }}</small>
            <RouletteBetMarkers :people="bettors[spot] ?? []" />
          </button>
        </div>
        <div class="three-grid">
          <button
            v-for="dozen in [1, 2, 3]"
            :key="dozen"
            :class="{ staked: amounts[`dozen:${dozen}`] }"
            :disabled="!canAdd(`dozen:${dozen}`)"
            :aria-label="label(`dozen:${dozen}`)"
            @click="add(`dozen:${dozen}`, chip)"
          >
            {{ rouletteSpotLabel(`dozen:${dozen}`)
            }}<small>{{
              amounts[`dozen:${dozen}`] ? `${amounts[`dozen:${dozen}`]} 🍌` : '3×'
            }}</small>
            <RouletteBetMarkers :people="bettors[`dozen:${dozen}`] ?? []" />
          </button>
        </div>
        <div class="three-grid">
          <button
            v-for="column in [1, 2, 3]"
            :key="column"
            :class="{ staked: amounts[`column:${column}`] }"
            :disabled="!canAdd(`column:${column}`)"
            :aria-label="label(`column:${column}`)"
            @click="add(`column:${column}`, chip)"
          >
            Kol. {{ column
            }}<small>{{
              amounts[`column:${column}`] ? `${amounts[`column:${column}`]} 🍌` : '3×'
            }}</small>
            <RouletteBetMarkers :people="bettors[`column:${column}`] ?? []" />
          </button>
        </div>
        <div class="zeros">
          <button
            v-for="zero in ['0', '00'] as const"
            :key="zero"
            class="green"
            :class="{ staked: amounts[`n:${zero}`] }"
            :disabled="!canAdd(`n:${zero}`)"
            :aria-label="label(`n:${zero}`)"
            @click="add(`n:${zero}`, chip)"
          >
            {{ zero }}<small v-if="amounts[`n:${zero}`]">{{ amounts[`n:${zero}`] }} 🍌</small>
            <RouletteBetMarkers :people="bettors[`n:${zero}`] ?? []" />
          </button>
        </div>
        <div class="number-grid">
          <button
            v-for="number in numbers"
            :key="number"
            :class="[rouletteColour(number), { staked: amounts[`n:${number}`] }]"
            :disabled="!canAdd(`n:${number}`)"
            :aria-label="label(`n:${number}`)"
            @click="add(`n:${number}`, chip)"
          >
            {{ number }}<small v-if="amounts[`n:${number}`]">{{ amounts[`n:${number}`] }} 🍌</small>
            <RouletteBetMarkers :people="bettors[`n:${number}`] ?? []" />
          </button>
        </div>
      </div>
      <div class="edit-controls">
        <button
          :disabled="!canUndo"
          @click="undo"
        >
          ↶ Fortryd sidste</button
        ><button
          :disabled="!canEdit || !view?.me?.total"
          @click="clear"
        >
          Ryd alle
        </button>
      </div>
      <ul
        v-if="view?.me?.bets.length"
        class="accepted-bets"
        aria-label="Dine serverbekræftede indsatser"
      >
        <li
          v-for="bet in view.me.bets"
          :key="bet.spot"
        >
          {{ rouletteSpotLabel(bet.spot) }} <b>{{ bet.amount }} 🍌</b>
        </li>
      </ul>
      <p class="muted">
        Indsatser trækkes med det samme. Ændr eller ryd dem, mens bordet er åbent, og få forskellen
        tilbage. Næste runde starter uden indsatser.
      </p>
    </section>

    <section
      class="panel"
      aria-labelledby="players-title"
    >
      <div class="section-heading">
        <h2 id="players-title">Med ved bordet</h2>
        <span>{{ view?.players.length ?? 0 }} spillere</span>
      </div>
      <p class="muted">
        Offentlige, bekræftede indsatser · runde
        {{ view ? `kl. ${rouletteRoundTime(view.round.id)}` : '…' }}
      </p>
      <ul
        v-if="view?.players.length"
        class="players"
      >
        <li
          v-for="player in view.players"
          :key="player.name"
        >
          <div class="player-heading">
            <NuxtLink :to="`/person/${encodeURIComponent(player.name)}`"
              ><UserAvatar
                class="avatar"
                :name="player.name"
              /><b>{{ player.name }}</b></NuxtLink
            ><strong>{{ player.total }} 🍌</strong>
          </div>
          <div class="public-bets">
            <span
              v-for="bet in player.bets"
              :key="bet.spot"
              >{{ rouletteSpotLabel(bet.spot) }} <b>{{ bet.amount }} 🍌</b></span
            >
          </div>
        </li>
      </ul>
      <p
        v-else
        class="muted"
      >
        Ingen indsatser endnu i denne runde.
      </p>
    </section>
    <CasinoLimit
      class="roulette-budget"
      :limit="view?.me?.limit"
    />
    <div class="sound-controls">
      <button
        type="button"
        class="sound-toggle"
        data-roulette-sound
        :aria-pressed="sound.enabled.value"
        @click="sound.toggle"
      >
        {{ sound.enabled.value ? '♪ Lyd til' : '♪ Lyd fra' }}
      </button>
    </div>
    <details class="panel rules">
      <summary>Sådan spiller du</summary>
      <p>
        Alle spiller på samme amerikanske hjul med 38 felter: 1–36, 0 og 00. En runde varer 30
        sekunder: 20 sekunder til indsatser, 6 sekunders spin og 4 sekunder til resultatet.
      </p>
      <p>
        Et enkelt tal giver 36× tilbage, grøn (0 eller 00) 18×, dusin og kolonne 3×, og øvrige
        felter 2×. Det er inklusive indsatsen. Rød, sort og øvrige felter taber på 0 og 00.
      </p>
      <p>
        Kolonne 1: 1, 4, 7 … 34. Kolonne 2: 2, 5, 8 … 35. Kolonne 3: 3, 6, 9 … 36. Spil kun med 5,
        10, 25 eller 50 🍌 chips, mindst 5 og højst 50 🍌 pr. felt og 50 🍌 samlet.
      </p>
      <p>
        Den fælles daglige casinotabsgrænse er 300 🍌. Et tidligere resultat ændrer ikke chancen i
        næste runde.
      </p>
    </details>
  </div>
</template>

<style scoped>
.roulette-page {
  max-width: 560px;
  margin: auto;
  padding: calc(20px + var(--safe-t)) 14px 24px;
  color: var(--text);
}
.roulette-budget {
  margin-top: 14px;
  line-height: 1.6;
}
.roulette-budget :deep(span),
.roulette-budget :deep(small) {
  min-width: 0;
  white-space: normal;
  overflow-wrap: anywhere;
  line-height: 1.6;
}
.felt {
  margin-top: 16px;
  padding: 18px 16px 14px;
  border: 1px solid #b49355;
  border-radius: 26px;
  color: #fff6df;
  background: radial-gradient(ellipse at 50% 25%, #266b50, #103b2d 85%);
  box-shadow: var(--shadow-sm);
}
.table-heading,
.section-heading,
.round-state,
.player-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}
.table-heading {
  font-size: 10px;
  color: #e3ce9e;
  letter-spacing: 0.06em;
  flex-wrap: wrap;
}
.round-state {
  margin-top: 15px;
  min-height: 48px;
}
.round-state strong {
  font-size: clamp(17px, 5vw, 23px);
}
.countdown {
  font-size: 32px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  display: flex;
  gap: 4px;
  align-items: baseline;
}
.countdown small {
  font-size: 11px;
  font-weight: 500;
}
.phase-copy {
  font-size: 12px;
  color: #e2e7cf;
  margin: 0 0 14px;
}
.result-strip {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 62px;
  padding: 10px 14px;
  margin-top: 14px;
  border: 1px solid #dfc58b40;
  border-radius: 16px;
  background: #001c2160;
}
.result-strip small {
  display: block;
  margin-top: 4px;
  color: #e3ce9e;
  font-size: 11px;
}
.result-number {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  font-size: 24px;
  font-weight: 800;
  border: 1px solid #e5c789;
}
.red {
  background: #a93042 !important;
  color: white;
}
.black {
  background: #172b29 !important;
  color: white;
}
.green {
  background: #176247 !important;
  color: white;
}
.receipt,
.notice,
.panel,
.betting-panel {
  background: var(--surface);
  border: 1px solid var(--hairline);
  border-radius: 20px;
  padding: 16px;
  margin-top: 14px;
  box-shadow: var(--shadow-sm);
}
.receipt div {
  display: grid;
  gap: 5px;
}
.receipt span {
  font-size: 11px;
  color: var(--muted);
}
.receipt strong {
  font-size: 24px;
}
.receipt p {
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--muted);
}
.positive {
  color: light-dark(#287343, #95d7ac);
}
h2 {
  margin: 0;
  font-size: 17px;
}
.section-heading > b,
.section-heading > span {
  font-size: 12px;
}
.muted,
.notice p,
.connection,
.rules p {
  color: var(--muted);
  font-size: 12px;
  line-height: 1.65;
}
.notice p {
  margin: 5px 0;
}
.notice a {
  color: var(--text);
  text-underline-offset: 3px;
}
.error {
  border-color: light-dark(#b5404e, #f3a0a9);
}
.error p {
  color: var(--text);
}
button {
  font: inherit;
  cursor: pointer;
  touch-action: manipulation;
}
button:disabled {
  cursor: default;
}
button:focus-visible,
a:focus-visible,
summary:focus-visible {
  outline: 3px solid var(--accent);
  outline-offset: 3px;
}
.chip-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin: 18px 0 12px;
}
.chip-controls button {
  display: grid;
  place-content: center;
  width: 55px;
  height: 55px;
  flex-shrink: 0;
  border: 3px dashed #e1c68b;
  border-radius: 50%;
  background: var(--surface-2);
  color: var(--text);
  font-size: 18px;
  font-weight: 800;
  box-shadow: 0 3px 0 #735324;
}
.chip-controls small {
  font-size: 11px;
}
.chip-controls .selected {
  background: #f4d48a;
  color: #312711;
  outline: 2px solid #b28639;
  outline-offset: 3px;
}
.chip-controls > span {
  font-size: 10px;
  color: var(--muted);
  line-height: 1.6;
}
.save-status {
  font-size: 12px;
  line-height: 1.6;
  min-height: 38px;
  margin-bottom: 12px;
}
.bet-board {
  padding: 8px;
  border: 1px solid #d4b475;
  border-radius: 15px;
  background: #174d39;
  color: #fff6df;
}
.colour-grid,
.zeros,
.number-grid,
.three-grid,
.outside-grid {
  display: grid;
  gap: 4px;
  margin-top: 4px;
}
.colour-grid,
.zeros,
.outside-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.colour-grid {
  margin-top: 0;
}
.bet-board .green-bet {
  width: 100%;
  margin-top: 4px;
}
.number-grid,
.three-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}
.bet-board button {
  position: relative;
  container-type: inline-size;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  min-height: 49px;
  padding: 4px 2px;
  border: 1px solid #e4d0a570;
  border-radius: 5px;
  background: #1e5843;
  color: #fff9e6;
  font-size: 16px;
  font-weight: 750;
}
.bet-board button small {
  font-size: 10px;
  font-weight: 600;
}
.bet-board button:disabled {
  color: #fff9e6b3;
}
.bet-board button.staked {
  outline: 2px solid #ffdf86;
  outline-offset: -3px;
  color: #fff9e6;
}
.bet-board button.staked small {
  padding: 1px 5px;
  border-radius: 99px;
  background: #f7d583;
  color: #302811;
}
.three-grid button,
.outside-grid button {
  font-size: 13px;
}
.edit-controls {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}
.edit-controls button,
.notice button {
  flex: 1;
  min-height: 44px;
  padding: 9px 12px;
  background: var(--surface-2);
  border: 1px solid var(--hairline);
  border-radius: 12px;
  color: var(--text);
  font-size: 12px;
  font-weight: 700;
}
.edit-controls button:disabled {
  opacity: 0.45;
}
.accepted-bets,
.players,
.history {
  list-style: none;
  padding: 0;
}
.accepted-bets,
.public-bets {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.accepted-bets li,
.public-bets > span {
  padding: 6px 8px;
  border-radius: 8px;
  background: var(--surface-2);
  font-size: 11px;
}
.players {
  margin: 12px 0 0;
}
.players > li + li {
  border-top: 1px solid var(--hairline);
  margin-top: 14px;
  padding-top: 14px;
}
.player-heading a {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 8px;
  color: var(--text);
  text-decoration: none;
  font-size: 13px;
  overflow-wrap: anywhere;
}
.player-heading > strong {
  font-size: 12px;
  white-space: nowrap;
}
.avatar {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--accent-light);
  color: var(--text);
}
.public-bets {
  margin: 8px 0 0 42px;
}
.recent-results {
  display: grid;
  grid-template-columns: repeat(10, minmax(0, 1fr));
  gap: 3px;
  margin: 10px 0 0;
  padding: 0;
  list-style: none;
}
.recent-results li {
  display: grid;
  place-items: center;
  height: 26px;
  min-width: 0;
  border: 1px solid #dfc58b60;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 750;
  font-variant-numeric: tabular-nums;
}
.recent-results li:first-child {
  box-shadow: inset 0 0 0 1px #efce83;
}
.sound-controls {
  display: flex;
  justify-content: flex-end;
  margin: 16px 0 0;
}
.sound-toggle {
  min-height: 40px;
  padding: 8px 14px;
  border: 1px solid var(--hairline);
  border-radius: 12px;
  color: var(--muted);
  background: var(--surface);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}
.rules summary {
  min-height: 32px;
  display: list-item;
  cursor: pointer;
  font-weight: 700;
  font-size: 14px;
}
@media (max-width: 350px) {
  .roulette-page {
    padding-inline: 10px;
  }
  .betting-panel,
  .panel {
    padding: 12px;
  }
  .chip-controls {
    gap: 9px;
  }
  .chip-controls button {
    width: 49px;
    height: 49px;
  }
}
</style>
