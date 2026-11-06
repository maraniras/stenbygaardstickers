<script setup lang="ts">
useHead({ title: 'Daglige spil · Stenbygaard Stickers' })
const { name, ready } = useUser()
const { state, error, loading, reload } = useEconomy()
const cityDone = computed(() => Boolean(state.value?.city.finished))
const wheelDone = computed(() => Boolean(state.value?.wheel))
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
      class="advent-link"
      to="/spil/julekalender"
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
      <span class="advent-link-cta">Prøv kalenderen <span aria-hidden="true">→</span></span>
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
        <b>{{ cityDone && wheelDone ? 'Du er med igen i morgen' : 'En ny chance hver dag' }}</b
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
.advent-link {
  position: relative;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 16px;
  padding: 20px;
  overflow: hidden;
  border: 1px solid #c8ae775c;
  border-radius: 22px;
  background:
    linear-gradient(90deg, #163d37ee, #163d3733),
    url('/images/christmas-calendar-mix-max-faxe-v1.webp') center 40% / cover;
  color: #fff0cb;
  text-decoration: none;
}
.advent-link div > span {
  font-size: 8px;
  letter-spacing: 0.17em;
  font-weight: 700;
}
.advent-link h2 {
  margin-top: 5px;
  font-family: Georgia, serif;
  font-size: 28px;
  font-weight: 400;
  letter-spacing: -0.02em;
}
.advent-link p {
  margin: 5px 0 0;
  font-size: 11px;
  color: #eee4c9;
}
.advent-link-day {
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
  grid-column: 1/-1;
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  font-weight: 700;
}
.daily-page {
  max-width: 480px;
  margin: 0 auto;
  padding: calc(20px + var(--safe-t)) 16px calc(var(--nav-space) + 18px);
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
  margin-top: 16px;
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
