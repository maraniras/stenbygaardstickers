<script setup lang="ts">
import { BOX_PRIZES } from '../../../shared/utils/boxes'
useHead({ title: 'Dagens bokse · Stenbygaard Stickers' })
const {
  state,
  active,
  name,
  ready,
  selected,
  run,
  busy,
  flipped,
  resultVisible,
  balance,
  error,
  walletError,
  reload,
  toggle,
  play,
} = useDailyBoxes()
const rules = ref(false)

const net = computed(() =>
  run.value
    ? `${run.value.amount < 0 ? '−' : run.value.amount > 0 ? '+' : ''}${Math.abs(run.value.amount).toLocaleString('da-DK')}`
    : '',
)
</script>
<template>
  <div class="boxes-page">
    <PageHeader
      title="Dagens bokse"
      back-to="/spil/jul"
      compact
    >
      <template #actions
        ><NuxtLink
          v-if="balance !== null"
          class="page-balance"
          to="/spil/bananer"
          >🍌 {{ balance.toLocaleString('da-DK') }}</NuxtLink
        ></template
      >
    </PageHeader>
    <div class="box-intro">
      <span>12 BOKSE · 3 VALG</span>
      <h2>
        {{
          state && !active
            ? 'Boksene åbner til jul'
            : resultVisible
              ? 'Dine tre fund'
              : 'Hvilke tre tør du vælge?'
        }}
      </h2>
      <p>Samme bokse for alle. Nyt indhold kl. 04.00.</p>
    </div>
    <DailyBoxesBoard
      :selected="selected"
      :run="run"
      :flipped="flipped"
      :result-visible="resultVisible"
      :locked="busy || !!run || !name || !state || !active"
      :busy="busy"
      @toggle="toggle"
    />
    <div class="box-status">
      <template v-if="ready && !name"
        ><p>Vælg dit navn for at gemme dine fund.</p>
        <NuxtLink
          class="btn"
          to="/mig"
          >Vælg mit navn</NuxtLink
        ></template
      >
      <template v-else-if="!state"
        ><p role="status">{{ walletError || 'Henter dagens bokse…' }}</p>
        <button
          v-if="walletError"
          class="btn"
          @click="reload"
        >
          Prøv igen
        </button></template
      >
      <div
        v-else-if="!active"
        class="boxes-season"
        role="status"
      >
        <b>Et lille julespil</b>
        <p>Åbent 20. november–31. december.<br />Første spil åbner 20. november kl. 04.00.</p>
      </div>
      <div
        v-else-if="resultVisible && run"
        :class="['boxes-result', { loss: run.amount < 0, miv: run.amount === 0 }]"
        role="status"
      >
        <span>DAGENS RESULTAT</span><strong>{{ net }} 🍌</strong>
        <p>
          {{
            run.amount > 0
              ? 'Bananerne er lagt i dit lager.'
              : run.amount < 0
                ? 'Nisserne kom først til lageret.'
                : 'Det gik lige op. Miv.'
          }}
        </p>
        <small v-if="run.nominal < run.amount">Dit tab er begrænset til din saldo.</small>
      </div>
      <template v-else
        ><p
          class="selection-count"
          role="status"
        >
          {{ busy ? 'Dine tre bokse vender…' : `${selected.length} af 3 bokse valgt` }}
        </p>
        <button
          class="open-boxes"
          type="button"
          :disabled="selected.length !== 3 || busy"
          @click="play"
        >
          {{ busy ? 'Spændingen stiger…' : 'Vend 3 bokse' }}
        </button></template
      >
      <p
        v-if="error"
        class="error"
        role="alert"
      >
        {{ error }}
        <button
          type="button"
          @click="reload"
        >
          Opdatér
        </button>
      </p>
    </div>
    <footer>
      <span>{{
        !active && state
          ? 'Kun i juleperioden'
          : resultVisible
            ? 'Du kan vælge igen i morgen kl. 04.00'
            : 'Gratis · ét spil pr. dag'
      }}</span
      ><button
        type="button"
        @click="rules = true"
      >
        Sådan spiller du
      </button>
    </footer>
    <AppDialog
      v-if="rules"
      label="Sådan spiller du Dagens bokse"
      @close="rules = false"
    >
      <section class="boxes-rules">
        <h2>Dagens bokse</h2>
        <p>
          Et julespil, der er åbent fra 20. november kl. 04.00 til og med 31. december, dansk tid.
        </p>
        <p>
          Vælg tre af de 12 bokse. Du kan ændre dine valg, indtil du trykker “Vend 3 bokse”. Alle
          tre vender samtidig.
        </p>
        <p>
          Placeringen af præmierne er ens for alle den dag. Dine tre valg og dit resultat gemmes på
          din bruger, også på andre enheder.
        </p>
        <h3>Hver dag gemmer der sig</h3>
        <ul>
          <li>
            Seks bananpræmier:
            {{
              BOX_PRIZES.filter((p) => p.kind === 'bananas')
                .map((p) => p.amount)
                .join(', ')
            }}
            🍌
          </li>
          <li>Tre drillenisser: −10, −25 og −40 🍌</li>
          <li>Tre nitter: Miv, ingen bananer.</li>
        </ul>
        <p>
          De tre fund lægges sammen. Din saldo kan aldrig komme under nul. Nye bokse hver dag kl.
          04.00 dansk tid.
        </p>
        <button
          class="btn"
          type="button"
          @click="rules = false"
        >
          Forstået
        </button>
      </section>
    </AppDialog>
  </div>
</template>
<style scoped>
.boxes-season {
  padding: 12px;
  border: 1px solid var(--hairline);
  border-radius: 15px;
  background: var(--surface);
}
.boxes-page {
  max-width: 480px;
  height: var(--content-height);
  min-height: 580px;
  margin: auto;
  padding: calc(8px + var(--safe-t)) 14px 8px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.box-intro {
  text-align: center;
}
.box-intro > span {
  color: var(--muted);
  font-size: 9px;
  letter-spacing: 0.18em;
  font-weight: 800;
}
h2 {
  margin: 5px 0;
  font-size: 21px;
}
.box-intro p {
  margin: 0;
  font-size: 12px;
  color: var(--muted);
}
.box-status {
  min-height: 96px;
  text-align: center;
}
.box-status p {
  margin: 4px 0 9px;
  font-size: 12px;
  color: var(--muted);
}
.selection-count {
  font-weight: 700;
}
.open-boxes {
  width: 100%;
  min-height: 46px;
  border-radius: 14px;
  border: 1px solid #e8cc89;
  background: linear-gradient(115deg, #f7e4ad, #d9b66b);
  color: #4c3720;
  font-weight: 800;
  font-size: 15px;
}
.open-boxes:disabled {
  opacity: 0.5;
}
.boxes-result {
  border: 1px solid var(--hairline);
  border-radius: 16px;
  padding: 9px 12px;
  background: var(--surface);
}
.boxes-result > span {
  display: block;
  color: var(--muted);
  letter-spacing: 0.12em;
  font-size: 8px;
  font-weight: 800;
}
.boxes-result strong {
  display: block;
  font-size: 28px;
  color: #27835e;
}
.boxes-result.loss strong {
  color: #cf626c;
}
.boxes-result.miv strong {
  color: var(--muted);
}
.boxes-result p {
  margin: 3px 0;
}
.boxes-result small {
  color: var(--muted);
  font-size: 10px;
}
.error {
  color: #cf626c !important;
}
footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  color: var(--muted);
  font-size: 10px;
}
footer button {
  min-height: 32px;
  border: 0;
  padding: 4px 0 4px 6px;
  background: transparent;
  color: var(--muted);
  font-size: 10px;
  text-decoration: underline;
}
.boxes-rules {
  padding: 22px 22px calc(24px + var(--safe-b));
  font-size: 14px;
  line-height: 1.6;
}
.boxes-rules h3 {
  font-size: 15px;
  margin-bottom: 8px;
}
.boxes-rules ul {
  padding-left: 20px;
}
.boxes-rules .btn {
  width: 100%;
  margin-top: 12px;
}
:global(html[data-appearance='dark']) .boxes-result strong {
  color: #83d3a5;
}
:global(html[data-appearance='dark']) .boxes-result.loss strong {
  color: #ed929c;
}
:global(html[data-appearance='dark']) .boxes-result.miv strong {
  color: var(--muted);
}
@media (max-height: 740px) {
  .boxes-page {
    gap: 7px;
  }
  .box-intro h2 {
    font-size: 19px;
  }
  .box-status {
    min-height: 88px;
  }
}
</style>
