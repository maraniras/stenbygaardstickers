<script setup lang="ts">
import type { JackResponse, JackAction } from '../../../shared/types/bananjack'
import { JACK_BETS, jackScore } from '../../../shared/utils/bananjack'
useHead({ title: 'Bananjack · Stenbygaard Stickers' })
const { name, ready } = useUser()
const economy = useEconomy()
const data = ref<JackResponse | null>(null)
const busy = ref(false), loading = ref(false), error = ref(''), bet = ref(10)
const rules = ref<HTMLDialogElement>()
const game = computed(() => data.value?.game)
const playing = computed(() => game.value?.status === 'playing')
const net = computed(() => (game.value?.payout ?? 0) - (game.value?.staked ?? 0))
const resultText = computed(() => !game.value ? 'Klar til en hånd?' : playing.value ? `Din tur${game.value.hands.length > 1 ? ` · hånd ${game.value.active + 1} af ${game.value.hands.length}` : ''}` : game.value.hands[0]?.result === 'blackjack' ? 'Bananjack!' : net.value > 0 ? 'Bananer i hus!' : net.value === 0 ? 'Lige op' : 'Emil tog den her.')
const labels = { blackjack:'Bananjack!', win:'Vundet', lose:'Tabt', push:'Lige op' }
function accept(response: JackResponse) {
  const old = data.value?.game, next = response.game
  if (old && next && (next.sequence < old.sequence || (next.sequence === old.sequence && next.revision < old.revision))) return
  data.value = response
}
async function refresh() {
  if (!name.value || !ready.value || busy.value || loading.value) return
  const owner = name.value, token = userToken()
  loading.value = true
  try { const response = await $fetch<JackResponse>('/api/games/bananjack', { headers:{'x-user-token':token}, retry:0, timeout:20000 }); if (owner === name.value && token === userToken()) { accept(response); error.value='' } }
  catch (e:any) { if(owner === name.value) error.value=e?.data?.statusMessage || 'Hånden kunne ikke hentes. Prøv igen.' }
  finally { loading.value=false; if(name.value && (owner!==name.value || token!==userToken()))queueMicrotask(refresh) }
}
async function play(action: JackAction | 'deal') {
  if (busy.value || loading.value || !name.value || !data.value) return
  busy.value=true; error.value=''
  const owner=name.value, token=userToken()
  const body=action === 'deal' ? {action,id:crypto.randomUUID(),previous:game.value?.id ?? null,bet:bet.value} : {action,id:game.value!.id,revision:game.value!.revision}
  try {
    const response=await $fetch<JackResponse>('/api/games/bananjack',{method:'POST',body,headers:{'x-user-token':token},retry:0,timeout:25000})
    if(owner === name.value && token === userToken()){ accept(response); void economy.reload(); void useUser().refreshMe() }
  } catch(e:any) {
    if(owner === name.value && token === userToken()) {
      error.value=e?.data?.statusMessage || 'Forbindelsen blev afbrudt. Hent hånden igen — din indsats er gemt, hvis den nåede frem.'
      // Reconcile a possibly committed request; never retry a wager automatically.
      try { const response=await $fetch<JackResponse>('/api/games/bananjack',{headers:{'x-user-token':token},retry:0,timeout:20000}); if(owner===name.value && token===userToken())accept(response) } catch { /* Keep known hand and offer a read-only retry. */ }
    }
  } finally { busy.value=false; if(name.value && (owner!==name.value || token!==userToken()))queueMicrotask(refresh) }
}
watch([name,ready],()=>{data.value=null;error.value='';void refresh()},{immediate:true})
function visibleRefresh(){if(document.visibilityState==='visible')void refresh()}
let timer:ReturnType<typeof setInterval>
onMounted(()=>{window.addEventListener('focus',visibleRefresh);document.addEventListener('visibilitychange',visibleRefresh);timer=setInterval(visibleRefresh,30000)})
onBeforeUnmount(()=>{clearInterval(timer);window.removeEventListener('focus',visibleRefresh);document.removeEventListener('visibilitychange',visibleRefresh)})
</script>

<template>
  <div class="jack-page">
    <header><NuxtLink class="back-link" to="/spil/casino">← Casino</NuxtLink><NuxtLink v-if="data" class="balance" to="/spil/bananer">🍌 {{ data.balance.toLocaleString('da-DK') }}</NuxtLink></header>
    <div class="title-row"><h1>Banan<span>jack</span></h1><button class="rules-button" @click="rules?.showModal()">Regler</button></div>
    <div v-if="ready && !name" class="login"><b>Hvem sidder ved bordet?</b><p>Vælg dit navn for at spille med dine bananer.</p><NuxtLink class="btn" to="/mig">Vælg mit navn</NuxtLink></div>
    <div v-if="error" class="error" role="alert">{{ error }} <button :disabled="busy || loading" @click="refresh">Hent hånden igen</button></div>
    <p v-if="loading && !data" role="status" class="note">Finder din plads ved bordet…</p>
    <section class="table" aria-label="Bananjack spillebord" :aria-busy="busy">
      <div class="dealer-label"><b>Emils hånd</b><span v-if="game">{{ playing ? jackScore([game.dealer[0]!]).total + ' + ?' : jackScore(game.dealer as number[]).total }}</span></div>
      <div class="cards dealer"><template v-if="game"><JackCard v-for="(card,i) in game.dealer" :key="i" :card="card" /></template><template v-else><JackCard :card="null" /><JackCard :card="null" /></template></div>
      <div class="table-caption">BANANJACK BETALER 3:2 <span>DEALER STÅR PÅ ALLE 17</span></div>
      <div v-if="game" class="hands">
        <section v-for="(hand,index) in game.hands" :key="index" class="hand" :class="{active:playing && index===game.active}">
          <div class="hand-label"><b>{{ game.hands.length > 1 ? `Hånd ${index+1}` : 'Din hånd' }}</b><span>{{ jackScore(hand.cards).total }}{{ jackScore(hand.cards).soft ? ' · soft' : '' }}<template v-if="hand.result"> · {{ labels[hand.result] }}</template></span></div>
          <div class="cards"><JackCard v-for="(card,i) in hand.cards" :key="i" :card="card" /></div><small>Indsats {{ hand.bet }} 🍌</small>
        </section>
      </div>
      <div v-else class="empty-hand"><img src="/marker.png" alt=""><p>Emil har blandet kortene.<br>Han ser meget sikker ud. Det gør han altid.</p></div>
    </section>
    <div class="status" role="status" aria-live="polite"><b>{{ busy ? 'Kortene er på vej…' : resultText }}</b><span v-if="game && !playing">{{ net > 0 ? '+' : '' }}{{ net }} 🍌 netto · {{ game.payout }} udbetalt inkl. indsats</span></div>
    <div v-if="playing" class="actions"><button v-for="action in (['hit','stand','double','split'] as const)" :key="action" :disabled="busy || loading || !game?.actions.includes(action)" @click="play(action)">{{ {hit:'Træk kort',stand:'Stå',double:'Fordobl',split:'Split'}[action] }}</button><p>Fordobl: ét kort og stå. Maks. 50 🍌 pr. hånd.</p></div>
    <div v-else-if="name" class="bet-panel"><fieldset :disabled="busy || loading"><legend>Din indsats</legend><div class="bets"><button v-for="amount in JACK_BETS" :key="amount" :aria-pressed="bet===amount" :class="{selected:bet===amount}" :disabled="!data || amount>data.balance" @click="bet=amount">{{ amount }} 🍌</button></div></fieldset><button class="deal-button" :disabled="busy || loading || !data || data.balance<bet" @click="play('deal')">{{ game ? 'Spil næste hånd' : 'Giv kort' }} · {{ bet }} 🍌</button><NuxtLink v-if="data && data.balance < 10" class="note" to="/spil">Flere bananer? Tag dagens gratis spil →</NuxtLink></div>
    <dialog ref="rules" class="rules" @click="($event.target === rules) && rules?.close()"><div><button class="close" aria-label="Luk regler" @click="rules?.close()">✕</button><h2>Sådan spiller du Bananjack</h2><ul><li>Kom tættere på 21 end Emil. Over 21 taber.</li><li>Es er 1 eller 11. Billedkort er 10.</li><li>Seks kortspil blandes på ny til hver runde. Dealeren tjekker for blackjack og står på alle 17, også soft 17.</li><li>Bananjack er es + et 10-kort på de to første kort og giver 3:2. Almindelig sejr giver 1:1. Ved lige op får du indsatsen tilbage.</li><li>Vælg 10–50 bananer i trin på 10. Fordobl på de første to kort, hvis du har råd, og hånden højst kommer på 50. Du får ét kort og står.</li><li>Split to kort med samme værdi. Maks. fire hænder. Hver ekstra hånd koster samme indsats. Split-esser får kun ét kort hver. 21 efter split giver almindelig sejr.</li><li>Ingen forsikring eller surrender. Din igangværende hånd gemmes, når du forlader siden.</li></ul><button class="deal-button" @click="rules?.close()">Tilbage til bordet</button></div></dialog>
  </div>
</template>

<style scoped>
.jack-page{max-width:480px;margin:auto;padding:calc(14px + var(--safe-t)) 16px calc(var(--nav-space) + 18px)}header,.title-row{display:flex;align-items:center;justify-content:space-between;gap:12px}.back-link,.balance{min-height:44px;display:flex;align-items:center;text-decoration:none;color:var(--text);font-size:13px}.balance{font-weight:750;font-variant-numeric:tabular-nums}h1{font-size:34px;letter-spacing:-.06em}h1 span{color:var(--accent)}button{cursor:pointer;font:inherit}.rules-button{min-height:44px;border:0;background:none;color:var(--muted);font-size:12px;text-decoration:underline}.table{margin-top:12px;border:1px solid #c7a35b66;border-radius:23px;background:radial-gradient(ellipse at 50% 30%,#28574a,#112f26);color:#fdf4db;padding:15px 12px;box-shadow:inset 0 0 0 5px #fff2}.dealer-label,.hand-label{display:flex;align-items:center;justify-content:space-between;gap:5px;font-size:12px}.dealer-label>span,.hand-label>span{font-variant-numeric:tabular-nums;color:#e9d699;font-size:11px}.cards{display:flex;justify-content:center;gap:0;min-height:88px;padding:7px 10px 0 0;overflow-x:auto}.cards>:not(:first-child){margin-left:-12px}.dealer{min-height:95px}.table-caption{text-align:center;margin:13px 0;color:#dfc384;font-size:9px;font-weight:700;letter-spacing:.08em}.table-caption span{display:block;margin-top:4px;font-size:8px;opacity:.8}.hands{display:grid;gap:8px}.hand{min-width:0;padding:8px;border:1px solid #fff2;border-radius:12px}.hand.active{border-color:#f3d58b;background:#fff1;box-shadow:0 0 0 1px #f3d58b22}.hand small{display:block;text-align:center;font-size:10px;color:#d7dfcf;margin-top:5px}.empty-hand{display:flex;align-items:center;justify-content:center;gap:13px;padding:13px 0}.empty-hand img{width:43px;height:52px;object-fit:contain}.empty-hand p{font-size:11px;line-height:1.6;color:#dbdfce}.status{display:flex;flex-direction:column;gap:4px;min-height:57px;justify-content:center;text-align:center;padding:10px 0}.status>b{font-size:17px}.status>span{font-size:11px;color:var(--muted)}fieldset{border:0;margin:0;padding:0}legend{font-size:11px;color:var(--muted);margin-bottom:7px}.bets{display:grid;grid-template-columns:repeat(5,1fr);gap:5px}.bets button,.actions>button{min-height:44px;border:1px solid var(--hairline);border-radius:11px;background:var(--surface);color:var(--text);font-size:12px;font-weight:700}.bets .selected{border-color:var(--accent);background:var(--accent-soft)}button:disabled{opacity:.4;cursor:default}.deal-button{display:block;width:100%;min-height:48px;margin-top:10px;border:1px solid #d3ad66;border-radius:12px;background:linear-gradient(135deg,#f3d890,#c89c4f);color:#2b2318;font-weight:800;font-size:14px}.actions{display:grid;grid-template-columns:1fr 1fr;gap:7px}.actions>button:first-child{background:var(--ink);color:white}.actions>p{grid-column:1/-1;text-align:center;font-size:10px;color:var(--muted);margin:2px 0}.note{display:block;font-size:12px;text-align:center;color:var(--muted);margin-top:12px;line-height:1.5}.login,.error{padding:12px;margin-top:10px;border-radius:12px;background:var(--accent-soft);font-size:12px;line-height:1.5}.error button{min-height:44px;background:none;border:0;text-decoration:underline;color:var(--text)}.rules{max-width:420px;width:calc(100% - 28px);max-height:85dvh;margin:auto;padding:20px;border:1px solid var(--hairline);border-radius:20px;background:var(--surface);color:var(--text);box-sizing:border-box}.rules::backdrop{background:#0009;backdrop-filter:blur(5px)}.rules h2{font-size:21px;margin:8px 30px 14px 0}.rules ul{padding-left:19px;font-size:12px;line-height:1.7}.rules li+li{margin-top:7px}.close{float:right;min-height:36px;min-width:36px;border:0;border-radius:50%;background:var(--surface-2);color:var(--text)}a:focus-visible,button:focus-visible{outline:2px solid var(--accent);outline-offset:3px}@media(max-width:350px){.jack-page{padding-left:12px;padding-right:12px}.table{padding:12px 9px}.bets button{font-size:11px}}
</style>
