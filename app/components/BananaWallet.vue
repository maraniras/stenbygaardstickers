<script setup lang="ts">
const props = defineProps<{ person: string, own?: boolean }>()
const { people, state, error, reload, reloadPeople } = useEconomy()
const { isTaken } = useUsers()
const wallet = computed(() => props.own && state.value ? state.value.wallet : people.value[props.person.toLocaleLowerCase('da')])
</script>
<template>
  <NuxtLink v-if="own && wallet" class="wallet-link" to="/spil/bananer"><BananaStorage compact :balance="wallet.balance" :peak="wallet.peakBalance" own /></NuxtLink>
  <BananaStorage v-else-if="wallet" compact class="wallet-public" :balance="wallet.balance" :peak="wallet.peakBalance" />
  <div v-else class="wallet-empty"><span aria-hidden="true">🍌</span><div><b>{{ isTaken(person) ? 'Henter bananlager…' : 'Intet bananlager endnu' }}</b><small>{{ isTaken(person) ? 'Saldoen følger brugeren på alle enheder.' : 'Bananer starter, når personen har valgt sin bruger.' }}</small><button v-if="own && error" @click="reload">Prøv igen</button><button v-else-if="isTaken(person)" @click="reloadPeople">Hent saldo</button></div></div>
</template>
<style scoped>
.wallet-link { display:block; margin-top:14px; color:inherit; text-decoration:none; border-radius:22px; }.wallet-public { margin-top:14px; }.wallet-link:focus-visible { outline:3px solid var(--text); outline-offset:4px; }.wallet-empty { display:flex; align-items:center; gap:13px; margin-top:14px; padding:16px; border-radius:20px; background:var(--accent-soft); }.wallet-empty > span { font-size:33px; }.wallet-empty b { display:block; font-size:15px; }.wallet-empty small { display:block; margin-top:4px; color:var(--muted); font-size:11px; }.wallet-empty button { min-height:44px; margin:6px 0 -8px; padding:0; border:0; background:none; color:var(--text); text-decoration:underline; cursor:pointer; }
</style>
