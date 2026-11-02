<script setup lang="ts">
import { SLOT_BETS, SLOT_PRIZES, SLOT_SYMBOLS, SLOT_RTP } from '../../../shared/utils/slots'
definePageMeta({
  middleware: () => {
    if (!useRuntimeConfig().public.banandittenEnabled)
      return navigateTo('/spil/casino', { replace: true })
  },
})
useHead({ title: 'Bananditten · Stenbygaard Stickers' })
const {
  name,
  ready,
  data,
  shownBalance,
  busy,
  locked,
  error,
  bet,
  canSpin,
  refresh,
  spin,
  positions,
  rolling,
  result,
} = useBananditten()
const rules = ref<HTMLDialogElement>()
const net = computed(() => (result.value ? result.value.payout - result.value.bet : 0))
const outcome = computed(() => SLOT_PRIZES.find((p) => p.multiplier === result.value?.multiplier))
const resultNames = computed(() =>
  result.value?.reels.map((id) => SLOT_SYMBOLS.find((s) => s.id === id)?.name).join(' · '),
)
const budget = computed(() => data.value?.dailyLimit)
const resetLabel = computed(() =>
  budget.value
    ? new Date(budget.value.nextResetAt).toLocaleString('da-DK', {
        timeZone: 'Europe/Copenhagen',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '',
)
</script>
<template>
  <div class="slots-page">
    <header>
      <NuxtLink
        to="/spil/casino"
        class="back"
        aria-label="Tilbage til casino"
        >←</NuxtLink
      >
      <h1>Banan<span>ditten</span></h1>
      <NuxtLink
        v-if="shownBalance !== null"
        class="balance"
        to="/spil/bananer"
        ><img
          src="/badges/banana-baron.webp"
          alt="Bananer"
        />{{ shownBalance.toLocaleString('da-DK') }}</NuxtLink
      >
    </header>
    <div
      v-if="ready && !name"
      class="login"
    >
      <b>Hvem trækker i håndtaget?</b
      ><NuxtLink
        class="btn"
        to="/mig"
        >Vælg dit navn for at spille</NuxtLink
      >
    </div>
    <section
      class="machine"
      :class="{ jackpot: !rolling && result?.multiplier === 100, rolling }"
      aria-label="Bananditten spilleautomat"
    >
      <div class="marquee">
        <span class="lamp" /><span>JACKPOT <b>100×</b></span
        ><span class="lamp" />
      </div>
      <div class="reel-area">
        <SlotReels
          :positions="positions"
          :rolling="rolling"
        /><SlotLever
          :disabled="!canSpin"
          @spin="spin"
        />
      </div>
      <div class="machine-bottom">
        <span>ÉN GEVINSTLINJE</span><span>{{ SLOT_RTP }} % RTP</span>
      </div>
    </section>
    <div
      class="outcome"
      :class="{ won: !rolling && net > 0, jackpot: !rolling && result?.multiplier === 100 }"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <template v-if="rolling"
        ><span class="eyebrow">HJULENE DREJER</span><strong>Hvad lander den på?</strong></template
      >
      <template v-else-if="result"
        ><span class="eyebrow">{{ outcome?.name }} · {{ result.multiplier }}×</span
        ><strong :class="{ negative: net < 0 }"
          >{{ net > 0 ? '+' : net < 0 ? '−' : ''
          }}{{ Math.abs(net).toLocaleString('da-DK') }} 🍌</strong
        ><small>{{ result.payout.toLocaleString('da-DK') }} 🍌 udbetalt inkl. indsats</small
        ><span class="sr-only">{{ resultNames }}</span></template
      >
      <template v-else
        ><span class="eyebrow">BANANDITTEN</span><strong>Håndtaget er dit</strong
        ><small>Tryk spin eller træk i håndtaget</small></template
      >
    </div>
    <div
      v-if="name"
      class="controls"
    >
      <div class="bet-label">
        <span>Din indsats</span
        ><span v-if="budget">{{ budget.remaining }} / {{ budget.amount }} 🍌 tilbage i dag</span>
      </div>
      <div
        class="bets"
        role="group"
        aria-label="Vælg indsats"
      >
        <button
          v-for="amount in SLOT_BETS"
          :key="amount"
          :disabled="locked"
          :aria-pressed="bet === amount"
          @click="bet = amount"
        >
          {{ amount }}<span aria-hidden="true"> 🍌</span>
        </button>
      </div>
      <button
        class="spin"
        :disabled="!canSpin"
        @click="spin"
      >
        <span>{{ rolling ? 'Hjulene drejer…' : busy ? 'Henter…' : `Spin · ${bet} 🍌` }}</span
        ><span aria-hidden="true">↻</span>
      </button>
      <p
        v-if="budget && budget.remaining < SLOT_BETS[0]"
        class="hint"
      >
        Dagens indsatsgrænse er nået. Nyt budget {{ resetLabel }}.
      </p>
      <p
        v-else-if="data && data.balance < bet"
        class="hint"
      >
        Du har ikke nok bananer til denne indsats.
      </p>
    </div>
    <div
      v-if="error"
      class="error"
      role="alert"
    >
      {{ error
      }}<button
        :disabled="locked"
        @click="refresh"
      >
        Hent resultat igen
      </button>
    </div>
    <footer>
      <span>Nyt dagsbudget kl. 04.00</span
      ><button @click="rules?.showModal()">Gevinster &amp; regler ⓘ</button>
    </footer>
    <dialog
      ref="rules"
      aria-labelledby="slot-rules-title"
      @click="$event.target === $event.currentTarget && rules?.close()"
    >
      <button
        class="close"
        aria-label="Luk regler"
        @click="rules?.close()"
      >
        ×
      </button>
      <h2 id="slot-rules-title">Gevinster &amp; regler</h2>
      <p>
        Den midterste række er gevinstlinjen. Tre ens citroner giver 2×, jordbær 5×, Mix Max 10×,
        Faxe Kondi 25× og guldbananer 100×. To ens citroner, jordbær, Mix Max eller Faxe Kondi
        sammen med et bananblad eller en bananskræl giver indsatsen tilbage, uanset placeringen. Tre
        forskellige giver Miv. Bananskræl og bananblad er fyldmotiver.
      </p>
      <ul>
        <li
          v-for="prize in SLOT_PRIZES"
          :key="prize.multiplier"
        >
          <span>{{ prize.name }} · {{ prize.multiplier }}×</span
          ><b>{{ (prize.weight / 100).toLocaleString('da-DK') }} %</b>
        </li>
      </ul>
      <p>
        Udbetalingen inkluderer indsatsen. {{ SLOT_RTP }} % er den teoretiske tilbagebetaling over
        mange spins, før engangsbonusser fra badges. Det er ikke et løfte for dine spins.
        Gevinstchancerne følger tabellen ovenfor; symbolerne er ikke lige sandsynlige.
      </p>
      <p>
        Indsatser: 5–25 bananer. Du kan sætte i alt 500 bananer pr. spildøgn. Gevinster genskaber
        ikke dagsbudgettet. Det nulstilles kl. 04.00 dansk tid, og budget og saldo deles mellem dine
        enheder.
      </p>
    </dialog>
  </div>
</template>
<style scoped>
.slots-page {
  max-width: 480px;
  margin: auto;
  padding: calc(8px + var(--safe-t)) 14px 12px;
  min-height: calc(100dvh - var(--nav-space));
  display: flex;
  flex-direction: column;
  gap: 12px;
}
header {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
}
h1 {
  font-size: clamp(22px, 6vw, 29px);
  letter-spacing: -0.055em;
}
h1 span {
  color: var(--title, var(--text));
}
.back {
  display: grid;
  place-items: center;
  width: 34px;
  min-height: 44px;
  font-size: 23px;
  color: var(--muted);
  text-decoration: none;
}
.balance {
  margin-left: auto;
  display: flex;
  gap: 4px;
  align-items: center;
  font-size: 12px;
  font-weight: 800;
  color: var(--text);
  text-decoration: none;
  font-variant-numeric: tabular-nums;
}
.balance img {
  width: 23px;
  height: 23px;
}
.machine {
  border-radius: 25px;
  border: 1px solid #a68bbd70;
  padding: 14px 10px 10px 14px;
  background: radial-gradient(ellipse at 50% 30%, #eee6f8, #d8c9e8);
  box-shadow: var(--shadow-sm);
  position: relative;
}
.marquee {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 13px;
  letter-spacing: 0.12em;
  font-size: 11px;
  color: #755825;
  font-weight: 700;
  margin-bottom: 13px;
}
.marquee b {
  font-size: 15px;
  letter-spacing: 0;
}
.lamp {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #ffdb8e;
  box-shadow: 0 0 7px #ffc344;
}
.reel-area {
  display: flex;
  gap: 5px;
  align-items: center;
}
.reel-area > :first-child {
  flex: 1;
  min-width: 0;
}
.machine-bottom {
  display: flex;
  justify-content: space-between;
  padding: 15px 36px 1px 4px;
  color: #6d597b;
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.09em;
}
:global(html[data-appearance='dark'] .slots-page .machine) {
  background: radial-gradient(ellipse at 50% 30%, #4c365e, #21192e);
  border-color: #9573ad60;
}
:global(html[data-appearance='dark'] .slots-page .marquee) {
  color: #e1c38b;
}
:global(html[data-appearance='dark'] .slots-page .machine-bottom) {
  color: #b4a0c8;
}
.outcome {
  display: grid;
  align-content: center;
  justify-items: center;
  gap: 4px;
  min-height: 101px;
  text-align: center;
  border: 1px solid var(--hairline);
  border-radius: 19px;
  background: var(--surface);
  padding: 10px;
}
.outcome .eyebrow {
  font-size: 9px;
  color: var(--muted);
  letter-spacing: 0.12em;
}
.outcome strong {
  font-size: 26px;
  line-height: 1.1;
  letter-spacing: -0.04em;
}
.outcome small {
  font-size: 10px;
  color: var(--muted);
}
.outcome.won strong {
  color: light-dark(#287343, #95d7ac);
}
.outcome .negative {
  color: light-dark(#b5404e, #f3a0a9);
}
.outcome.jackpot {
  background: linear-gradient(135deg, #fff1b9, #e6b864);
  color: #48301a;
}
.outcome.jackpot strong {
  color: #287343;
}
.machine.jackpot {
  box-shadow: 0 0 25px #e5b75b70;
}
.sr-only {
  position: absolute;
  clip-path: inset(50%);
  width: 1px;
  height: 1px;
  overflow: hidden;
}
.controls {
  display: grid;
  gap: 9px;
}
.bet-label {
  display: flex;
  justify-content: space-between;
  gap: 6px;
  color: var(--muted);
  font-size: 10px;
}
.bets {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 5px;
}
.bets button {
  border: 1px solid var(--hairline);
  border-radius: 11px;
  min-height: 42px;
  background: var(--surface);
  color: var(--text);
  font: inherit;
  font-size: 13px;
  font-weight: 750;
}
.bets button[aria-pressed='true'] {
  background: var(--accent-soft);
  border-color: var(--accent);
  box-shadow: inset 0 0 0 1px var(--accent);
}
.bets button span {
  font-size: 10px;
}
.spin {
  border: 1px solid #bd965c;
  border-radius: 15px;
  min-height: 53px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 19px;
  background: linear-gradient(145deg, #fff0bb, #edc477 45%, #d3a15a);
  box-shadow: 0 3px 0 #81572f;
  color: #3b2930;
  font: inherit;
  font-size: 18px;
  font-weight: 800;
  line-height: 1.1;
  cursor: pointer;
}
.spin:disabled {
  opacity: 0.6;
  cursor: default;
}
.spin > span + span {
  font-size: 28px;
}
.hint {
  font-size: 11px;
  color: var(--muted);
  margin: 0;
}
.error {
  font-size: 12px;
  color: var(--muted);
  display: grid;
  gap: 5px;
}
.error button {
  font: inherit;
  color: var(--text);
  background: var(--surface);
  border: 1px solid var(--hairline);
  border-radius: 9px;
  padding: 9px;
}
footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 9px;
  color: var(--muted);
  margin-top: auto;
}
footer button {
  font: inherit;
  min-height: 36px;
  color: inherit;
  border: 0;
  background: none;
  padding: 0;
}
.login {
  display: grid;
  gap: 10px;
  background: var(--surface);
  padding: 16px;
  border-radius: 18px;
  font-size: 13px;
}
dialog {
  width: min(440px, calc(100% - 28px));
  max-height: 80dvh;
  margin: auto;
  border: 1px solid var(--hairline);
  border-radius: 22px;
  background: var(--surface);
  color: var(--text);
  padding: 24px;
  overflow: auto;
}
dialog::backdrop {
  background: #160f2a88;
}
dialog h2 {
  font-size: 22px;
  margin-right: 25px;
}
dialog p {
  font-size: 12px;
  line-height: 1.7;
  color: var(--muted);
  margin: 15px 0;
}
dialog ul {
  list-style: none;
  padding: 0;
}
dialog li {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 9px 0;
  font-size: 12px;
  border-bottom: 1px solid var(--hairline);
}
.close {
  position: absolute;
  right: 12px;
  top: 10px;
  background: none;
  border: 0;
  color: var(--muted);
  font-size: 28px;
  width: 40px;
  height: 40px;
}
button:focus-visible,
a:focus-visible {
  outline: 3px solid var(--accent);
  outline-offset: 3px;
}
@media (max-height: 700px) {
  .slots-page {
    gap: 6px;
    padding-top: calc(4px + var(--safe-t));
    padding-bottom: 4px;
  }
  .machine {
    padding-top: 8px;
  }
  .marquee {
    margin-bottom: 6px;
  }
  .outcome {
    min-height: 62px;
    padding: 7px;
    gap: 2px;
  }
  .outcome strong {
    font-size: 22px;
  }
  .machine-bottom {
    padding-top: 8px;
  }
  .controls {
    gap: 6px;
  }
  .bets button {
    min-height: 34px;
    font-size: 12px;
  }
  .spin {
    min-height: 44px;
    padding: 8px 14px;
    font-size: 16px;
  }
  .spin > span + span {
    font-size: 24px;
  }
  footer button {
    min-height: 24px;
  }
}
</style>
