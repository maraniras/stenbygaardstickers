<script setup lang="ts">
const props = defineProps<{ person: string, own?: boolean }>()
const { people, state, error, reload, reloadPeople } = useEconomy()
const { isTaken } = useUsers()
const wallet = computed(() => props.own && state.value ? state.value.wallet : people.value[props.person.toLocaleLowerCase('da')])
</script>
<template>
  <NuxtLink v-if="own && wallet" class="wallet" to="/spil/bananer"><img src="/badges/banana-baron.webp" alt=""><div><span>Dit bananlager</span><b>{{ wallet.balance.toLocaleString('da-DK') }} 🍌</b><small>Se belønninger og historik</small></div><span class="arrow" aria-hidden="true">↗</span></NuxtLink>
  <div v-else-if="wallet" class="wallet"><img src="/badges/banana-baron.webp" alt=""><div><span>Bananlager</span><b>{{ wallet.balance.toLocaleString('da-DK') }} 🍌</b><small>Højeste saldo: {{ wallet.peakBalance.toLocaleString('da-DK') }} 🍌</small></div></div>
  <div v-else class="wallet empty"><span aria-hidden="true">🍌</span><div><b>{{ isTaken(person) ? 'Henter bananlager…' : 'Intet bananlager endnu' }}</b><small>{{ isTaken(person) ? 'Saldoen følger brugeren på alle enheder.' : 'Bananer starter, når personen har valgt sin bruger.' }}</small><button v-if="own && error" @click="reload">Prøv igen</button><button v-else-if="isTaken(person)" @click="reloadPeople">Hent saldo</button></div></div>
</template>
<style scoped>
.wallet { display: flex; align-items: center; gap: 13px; margin-top: 14px; padding: 16px; border-radius: 20px; background: var(--accent-soft); color: var(--text); text-decoration: none; }.wallet > img { width: 54px; height: 54px; object-fit: contain; }.wallet > div { flex: 1; min-width: 0; }.wallet div > span { display: block; color: var(--muted); font-size: 11px; font-weight: 700; }.wallet b { display: block; margin: 3px 0; font-size: 25px; font-variant-numeric: tabular-nums; }.wallet small { display: block; color: var(--muted); font-size: 11px; }.arrow { font-size: 23px; }.empty > span { font-size: 33px; }.empty b { font-size: 15px; }.empty button { min-height: 44px; margin: 6px 0 -8px; padding: 0; border: 0; background: none; color: var(--text); text-decoration: underline; cursor: pointer; }.wallet:focus-visible { outline: 3px solid var(--text); outline-offset: 3px; }
</style>
