<script setup lang="ts">
useHead({ title: 'Daglige spil · Stenbygaard Stickers' })
const { name, ready } = useUser()
const { state, error, loading, reload } = useEconomy()
const cityDone = computed(() => Boolean(state.value?.city.finished))
const wheelDone = computed(() => Boolean(state.value?.wheel))
const boxesDone = computed(() => Boolean(state.value?.boxes))
</script>
<template>
  <div class="daily-page">
    <PageHeader
      title="Spil"
      description="En lille pause. Måske flere bananer."
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
    <GameSectionNav section="daily" />
    <NuxtLink
      class="boxes-card game-card"
      to="/spil/bokse"
      aria-label="Dagens bokse"
    >
      <div class="boxes-card-copy">
        <span class="boxes-kicker">12 BOKSE · 3 VALG</span>
        <h2>Dagens bokse</h2>
        <p>
          {{
            !state?.boxesActive
              ? 'Et dagligt julespil fra 20. november til 31. december.'
              : boxesDone
                ? `Dagens resultat: ${state!.boxes!.amount > 0 ? '+' : state!.boxes!.amount < 0 ? '−' : ''}${Math.abs(state!.boxes!.amount)} 🍌`
                : 'Vælg tre. Find bananer, drillenisser eller Miv.'
          }}
        </p>
        <span class="game-link"
          >{{
            !state?.boxesActive
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
    <div class="daily-reset">
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle
          cx="12"
          cy="12"
          r="9"
        />
        <path d="M12 7v5l3 2" />
      </svg>
      <div>
        <b>{{
          cityDone && wheelDone && (!state?.boxesActive || boxesDone)
            ? 'Du er med igen i morgen'
            : 'En ny chance hver dag'
        }}</b
        ><span>Nye spil kl. 04.00 dansk tid</span>
      </div>
    </div>
    <div
      v-if="ready && !name"
      class="login-box"
    >
      <b>Hvem spiller med?</b>
      <p>
        Vælg dit navn, og få 250 bananer i startsaldo. Dine spil og bananer følger dig på alle dine
        enheder.
      </p>
      <NuxtLink
        class="btn"
        to="/mig"
        >Vælg mit navn</NuxtLink
      >
    </div>
    <div
      v-if="error"
      class="error"
      role="alert"
    >
      {{ error }} <button @click="reload">Prøv igen</button>
    </div>
    <p
      v-if="loading && !state && name"
      class="lead"
      role="status"
    >
      Henter dine bananer og dagens spil…
    </p>
    <NuxtLink
      class="game-card city-card"
      to="/spil/byen"
      aria-label="Emil er faret vild"
      ><div class="city-visual">
        <DailyGameArt kind="city" /><span class="game-label">{{
          cityDone ? 'Dagens by er spillet' : 'Dagens hovedstad'
        }}</span
        ><span class="visual-title">Hvor er<br />Emil nu?</span>
      </div>
      <div class="card-body">
        <h2>Emil er faret vild</h2>
        <p>
          {{
            cityDone
              ? state?.city.won
                ? `Du fandt ${state.city.answer?.name} · +${state.city.reward} 🍌`
                : `Emil var i ${state?.city.answer?.name}. En ny by venter i morgen.`
              : 'Find byen fra oven. Emil har ingen anelse.'
          }}
        </p>
        <div class="card-bottom">
          <span class="game-meta">{{
            state?.city.guesses.length && !cityDone
              ? `${5 - state.city.guesses.length} gæt tilbage`
              : '5 gæt · 6 byer'
          }}</span
          ><span class="game-link"
            >{{ cityDone ? 'Se resultat' : state?.city.guesses.length ? 'Fortsæt' : 'Find Emil' }}
            <span aria-hidden="true">→</span></span
          >
        </div>
      </div></NuxtLink
    >
    <NuxtLink
      class="wheel-card game-card"
      to="/spil/hjulet"
      aria-label="Dagens lykkehjul"
      ><div class="wheel-copy">
        <span class="wheel-kicker">Lidt held skal man have</span>
        <h2>Dagens<br />lykkehjul</h2>
        <p>
          {{
            wheelDone
              ? state?.wheel?.prize
                ? `Du vandt ${state.wheel.prize} 🍌 i dag.`
                : 'Miv i dag. Måske i morgen?'
              : 'Ét gratis spin. Bananer eller bare… Miv.'
          }}
        </p>
      </div>
      <DailyGameArt kind="wheel" />
      <div class="wheel-bottom">
        <span class="game-meta">{{ wheelDone ? 'Spillet i dag ✓' : 'Gratis hver dag' }}</span
        ><span class="game-link"
          >{{ wheelDone ? 'Se resultat' : 'Spind hjulet' }} <span aria-hidden="true">→</span></span
        >
      </div></NuxtLink
    >
    <div
      v-if="state"
      class="streaks"
    >
      <span
        >🌍 {{ state.wallet.stats.cityStreak }}
        {{ state.wallet.stats.cityStreak === 1 ? 'dags' : 'dages' }} vinderstime</span
      ><span
        >🎡 {{ state.wallet.stats.wheelStreak }}
        {{ state.wallet.stats.wheelStreak === 1 ? 'dags' : 'dages' }} hjulstime</span
      >
    </div>
    <NuxtLink
      v-if="name"
      class="wallet-link"
      to="/spil/bananer"
      >Dit bananlager og dine belønninger <span aria-hidden="true">↗</span></NuxtLink
    >
  </div>
</template>
<style scoped>
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
.daily-page {
  max-width: 480px;
  margin: 0 auto;
  padding: calc(20px + var(--safe-t)) 16px 18px;
}
.lead {
  margin: 10px 0 0;
  color: var(--muted);
  font-size: 14px;
}
.daily-reset {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 20px 0;
}
.daily-reset > svg {
  width: 36px;
  height: 36px;
  padding: 9px;
  flex: none;
  border-radius: 12px;
  background: var(--surface);
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
}
.daily-reset b {
  display: block;
  font-size: 12px;
}
.daily-reset div > span {
  display: block;
  color: var(--muted);
  font-size: 11px;
  margin-top: 2px;
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
.city-visual {
  position: relative;
}
.game-label {
  position: absolute;
  top: 16px;
  left: 18px;
  padding: 5px 9px;
  border-radius: 7px;
  background: #d7ebbe;
  color: #203e35;
  font-size: 10px;
  font-weight: 800;
}
.visual-title {
  position: absolute;
  left: 18px;
  top: 57px;
  color: #f1f8e7;
  font-size: 27px;
  font-weight: 800;
  line-height: 1.12;
  letter-spacing: -0.04em;
}
.card-body {
  padding: 19px 18px 10px;
}
h2 {
  font-size: 23px;
  letter-spacing: -0.04em;
}
.card-body > p {
  margin: 8px 0 10px;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.6;
}
.card-bottom,
.wheel-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}
.game-meta {
  color: var(--muted);
  font-size: 11px;
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
.wheel-card {
  display: grid;
  grid-template-columns: 1fr 1fr;
  background: light-dark(#f7f2fd, #282032);
}
.wheel-copy {
  position: relative;
  z-index: 1;
  padding: 20px 0 0 18px;
}
.wheel-kicker {
  color: var(--muted);
  font-size: 10px;
  font-weight: 600;
}
.wheel-copy h2 {
  margin-top: 8px;
  font-size: 26px;
}
.wheel-copy p {
  margin: 9px 0 0;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.6;
}
.wheel-bottom {
  grid-column: 1 / -1;
  padding: 0 18px 9px;
}
.streaks {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding: 20px 0 0;
  color: var(--muted);
  font-size: 11px;
}
.wallet-link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 48px;
  margin-top: 8px;
  font-size: 12px;
  color: var(--muted);
  text-decoration: none;
}
.login-box {
  margin-bottom: 16px;
  padding: 16px;
  border-radius: 18px;
  background: var(--accent-soft);
}
.login-box b {
  font-size: 15px;
}
.login-box p {
  color: var(--muted);
  font-size: 12px;
}
.login-box .btn {
  min-height: 44px;
  font-size: 13px;
}
.error {
  margin-bottom: 15px;
  font-size: 13px;
  color: var(--muted);
}
.error button {
  min-height: 44px;
  border: 0;
  background: none;
  color: var(--text);
  text-decoration: underline;
}
a:focus-visible,
button:focus-visible {
  outline: 2px solid var(--text);
  outline-offset: 3px;
}
@media (max-width: 350px) {
  .visual-title,
  .wheel-copy h2 {
    font-size: 24px;
  }
}
</style>
