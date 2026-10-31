<script setup lang="ts">
useHead({ title: 'Dit bananlager · Stenbygaard Stickers' })
const { name, ready } = useUser()
const { state, error, loading, reload } = useEconomy()
const visibleCount = ref(20)
const history = computed(() => state.value?.history.slice(0, 250) ?? [])
const visibleHistory = computed(() => history.value.slice(0, visibleCount.value))
const hasMore = computed(() => visibleHistory.value.length < history.value.length)
watch(name, () => {
  visibleCount.value = 20
})
function loadMore() {
  visibleCount.value = Math.min(250, visibleCount.value + 20)
}
function amountText(amount: number) {
  return (amount > 0 ? '+' : amount < 0 ? '−' : '') + Math.abs(amount).toLocaleString('da-DK')
}
const time = (at: string) =>
  new Date(at).toLocaleString('da-DK', {
    timeZone: 'Europe/Copenhagen',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
</script>
<template>
  <div class="bank-page">
    <NuxtLink
      class="back"
      :to="name ? personUrl(name) : '/spil'"
      >{{ name ? '← Min profil' : '← Dagens spil' }}</NuxtLink
    >
    <header>
      <img
        src="/badges/banana-baron.webp"
        alt=""
      /><span class="eyebrow">Optjen. Gem. Gør Emil misundelig.</span>
      <h1>Dit bananlager</h1>
    </header>
    <div
      v-if="ready && !name"
      class="empty"
    >
      <p>Vælg dit navn for at få din egen saldo og 250 bananer i startsaldo.</p>
      <NuxtLink
        class="btn"
        to="/mig"
        >Vælg mit navn</NuxtLink
      >
    </div>
    <div
      v-else-if="!state"
      class="empty"
    >
      <p>{{ error || 'Henter dine bananer…' }}</p>
      <button
        v-if="error"
        class="btn secondary"
        @click="reload"
      >
        Prøv igen
      </button>
    </div>
    <template v-else
      ><BananaStorage
        :balance="state.wallet.balance"
        :peak="state.wallet.peakBalance"
      />
      <section class="earn">
        <h2>Sådan fylder du lageret</h2>
        <p>
          <b>250 🍌</b> for en sticker i Danmark. <b>500–5.000 🍌</b> i udlandet efter afstand fra
          Aalborg.
        </p>
        <p>
          Spil de daglige spil, og optjen badges. Belønningerne tilføjes automatisk — også for dine
          tidligere stickers og badges.
        </p>
        <NuxtLink to="/spil">Til dagens spil →</NuxtLink>
      </section>
      <section class="history">
        <h2>Seneste bevægelser</h2>
        <p class="hint">
          Viser {{ visibleHistory.length }} af {{ history.length }} bevægelser. De seneste 250
          gemmes på din bruger.
        </p>
        <p
          v-if="!history.length"
          class="hint"
        >
          Ingen bevægelser endnu.
        </p>
        <ol>
          <li
            v-for="entry in visibleHistory"
            :key="entry.id"
          >
            <div>
              <b>{{ entry.label }}</b
              ><time :datetime="entry.at">{{ time(entry.at) }}</time>
            </div>
            <span :class="{ positive: entry.amount > 0, negative: entry.amount < 0 }"
              >{{ amountText(entry.amount) }} 🍌</span
            >
          </li>
        </ol>
        <button
          v-if="hasMore"
          type="button"
          class="load-more btn secondary"
          @click="loadMore"
        >
          Indlæs flere
        </button>
      </section>
      <div class="future">
        <b>Noget at spare op til</b>
        <p>
          Kosmetiske ting er næste skridt. Nye varianter af fysiske Emil-stickers er også på
          idélisten.
        </p>
      </div></template
    >
    <p
      v-if="error && state"
      class="hint"
    >
      {{ error }}
      <button
        :disabled="loading"
        @click="reload"
      >
        Prøv igen
      </button>
    </p>
  </div>
</template>
<style scoped>
.bank-page {
  max-width: 520px;
  margin: 0 auto;
  padding: calc(20px + var(--safe-t)) 18px calc(var(--nav-space) + 20px);
}
.back {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  color: var(--muted);
  font-size: 13px;
  text-decoration: none;
}
header {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  margin: 10px 0 24px;
}
header img {
  width: 96px;
  height: 96px;
  object-fit: contain;
}
header .eyebrow {
  margin-top: 10px;
  font-size: 10px;
}
h1 {
  margin-top: 8px;
  font-size: 31px;
}
h2 {
  font-size: 18px;
}
.earn {
  margin-top: 20px;
  padding: 18px;
  border-radius: 20px;
  background: var(--surface);
}
.earn p,
.future p {
  font-size: 13px;
  color: var(--muted);
  line-height: 1.7;
}
.earn a {
  display: flex;
  align-items: center;
  min-height: 44px;
  font-size: 13px;
  font-weight: 700;
  text-decoration: none;
}
.history {
  margin-top: 28px;
}
.hint {
  color: var(--muted);
  font-size: 11px;
}
ol {
  list-style: none;
  padding: 0;
  margin: 15px 0 0;
}
li {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 13px 0;
  border-bottom: 1px solid var(--hairline);
}
li > div {
  min-width: 0;
}
li b {
  display: block;
  overflow-wrap: anywhere;
  font-size: 12px;
}
li time {
  display: block;
  color: var(--muted);
  font-size: 10px;
  margin-top: 3px;
}
li > span {
  flex: none;
  font-size: 13px;
  font-weight: 800;
}
.positive {
  color: light-dark(#287343, #95d7ac);
}
.negative {
  color: light-dark(#b5404e, #f3a0a9);
}
.load-more {
  width: 100%;
  margin-top: 14px;
}
.future {
  margin-top: 24px;
  padding: 18px;
  border-radius: 20px;
  background: var(--surface-2);
}
.future b {
  font-size: 14px;
}
.empty {
  padding: 20px 0;
  color: var(--muted);
  font-size: 14px;
}
button {
  min-height: 44px;
}
</style>
