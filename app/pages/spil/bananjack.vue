<script setup lang="ts">
import type { JackResponse, JackAction } from '../../../shared/types/bananjack'
import { JACK_BETS, jackScore } from '../../../shared/utils/bananjack'
useHead({ title: 'Bananjack · Stenbygaard Stickers' })
const { name, ready } = useUser()
const economy = useEconomy()
const data = ref<JackResponse | null>(null)
const shownBalance = ref<number | null>(null)
const busy = ref(false), loading = ref(false), error = ref(''), bet = ref(10)
const rules = ref<HTMLDialogElement>()
const dailyLimit = computed(() => data.value?.dailyLimit)
const limitReached = computed(() => Boolean(dailyLimit.value && dailyLimit.value.remaining < JACK_BETS[0]))
const canBet = (amount: number) => Boolean(data.value && data.value.balance >= amount && (!dailyLimit.value || dailyLimit.value.remaining >= amount))
const resetTime = computed(() => dailyLimit.value ? new Date(dailyLimit.value.nextResetAt).toLocaleString('da-DK',{timeZone:'Europe/Copenhagen',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}) : '')
let limitTimer: ReturnType<typeof setTimeout> | undefined
const { shown: game, animating, caption, present, reset } = useJackPresentation()
const locked = computed(() => busy.value || loading.value || animating.value)
const playing = computed(() => game.value?.status === 'playing')
const completed = computed(() => game.value?.status === 'finished' && !busy.value && !animating.value)
const net = computed(() => (game.value?.payout ?? 0) - (game.value?.staked ?? 0))
const outcome = computed(() => net.value > 0 ? 'win' : net.value < 0 ? 'lose' : 'push')
const dealerValue = computed(() => {
  const cards = game.value?.dealer ?? []
  const visible = cards.filter((card): card is number => card !== null)
  if (!visible.length) return '—'
  return `${jackScore(visible).total}${cards.includes(null) ? ' + ?' : ''}`
})
const resultText = computed(() => !game.value ? 'Klar til en hånd?' : playing.value ? `Din tur${game.value.hands.length > 1 ? ` · hånd ${game.value.active + 1} af ${game.value.hands.length}` : ''}` : game.value.hands[0]?.result === 'blackjack' ? 'Bananjack!' : net.value > 0 ? 'Bananer i hus!' : net.value === 0 ? 'Lige op' : 'Emil tog den her.')
const labels = { blackjack:'Bananjack!', win:'Vundet', lose:'Tabt', push:'Lige op' }
async function accept(response: JackResponse, animate = false) {
  const old = data.value?.game, next = response.game
  if (old && next && (next.sequence < old.sequence || (next.sequence === old.sequence && next.revision < old.revision))) return
  const changed = !old || !next || next.sequence !== old.sequence || next.id !== old.id || next.revision !== old.revision
  data.value = response
  clearTimeout(limitTimer)
  if (response.dailyLimit) limitTimer = setTimeout(() => { void refresh() }, Math.max(250, Date.parse(response.dailyLimit.nextResetAt) - Date.now() + 100))
  if (!animate || !changed) shownBalance.value = response.balance
  if (!changed && game.value) { game.value = next; return }
  const finished = await present(next, animate)
  if (finished) shownBalance.value = response.balance
  if (finished && animate && next?.status === 'finished' && next.payout > next.staked) void shootConfetti(next.hands[0]?.result === 'blackjack' ? 'normal' : 'small')
}
async function refresh() {
  if (!name.value || !ready.value || locked.value) return
  const owner = name.value, token = userToken()
  loading.value = true
  try { const response = await $fetch<JackResponse>('/api/games/bananjack', { headers:{'x-user-token':token}, retry:0, timeout:20000 }); if (owner === name.value && token === userToken()) { accept(response); error.value='' } }
  catch (e:any) { if(owner === name.value) error.value=e?.data?.statusMessage || 'Hånden kunne ikke hentes. Prøv igen.' }
  finally { loading.value=false; if(name.value && (owner!==name.value || token!==userToken()))queueMicrotask(refresh) }
}
async function play(action: JackAction | 'deal') {
  if (locked.value || !name.value || !data.value) return
  busy.value=true; error.value=''
  const owner=name.value, token=userToken()
  const authoritative = data.value.game
  const body=action === 'deal' ? {action,id:crypto.randomUUID(),previous:authoritative?.id ?? null,bet:bet.value} : {action,id:authoritative!.id,revision:authoritative!.revision}
  try {
    const response=await $fetch<JackResponse>('/api/games/bananjack',{method:'POST',body,headers:{'x-user-token':token},retry:0,timeout:25000})
    if(owner === name.value && token === userToken()){ await accept(response, true); void economy.reload(); void useUser().refreshMe() }
  } catch(e:any) {
    if(owner === name.value && token === userToken()) {
      error.value=e?.data?.statusMessage || 'Forbindelsen blev afbrudt. Hent hånden igen — din indsats er gemt, hvis den nåede frem.'
      // Reconcile a possibly committed request; never retry a wager automatically.
      try { const response=await $fetch<JackResponse>('/api/games/bananjack',{headers:{'x-user-token':token},retry:0,timeout:20000}); if(owner===name.value && token===userToken())accept(response) } catch { /* Keep known hand and offer a read-only retry. */ }
    }
  } finally { busy.value=false; if(name.value && (owner!==name.value || token!==userToken()))queueMicrotask(refresh) }
}
watch([name,ready],()=>{reset();data.value=null;shownBalance.value=null;error.value='';void refresh()},{immediate:true})
watch([name,ready],()=>clearTimeout(limitTimer))
function visibleRefresh(){if(document.visibilityState==='visible')void refresh()}
let timer:ReturnType<typeof setInterval>
onMounted(()=>{window.addEventListener('focus',visibleRefresh);document.addEventListener('visibilitychange',visibleRefresh);timer=setInterval(visibleRefresh,30000)})
onBeforeUnmount(()=>{clearInterval(timer);clearTimeout(limitTimer);window.removeEventListener('focus',visibleRefresh);document.removeEventListener('visibilitychange',visibleRefresh)})
</script>

<template>
  <div class="jack-page">
    <header><NuxtLink class="back-link" to="/spil/casino">← Casino</NuxtLink><NuxtLink v-if="shownBalance!==null" class="balance" to="/spil/bananer">🍌 {{ shownBalance.toLocaleString('da-DK') }}</NuxtLink></header>
    <div class="title-row"><h1>Banan<span>jack</span></h1><button class="rules-button" @click="rules?.showModal()">Regler</button></div>
    <div v-if="ready && !name" class="login"><b>Hvem sidder ved bordet?</b><p>Vælg dit navn for at spille med dine bananer.</p><NuxtLink class="btn" to="/mig">Vælg mit navn</NuxtLink></div>
    <div v-if="error" class="error" role="alert">{{ error }} <button :disabled="busy || loading" @click="refresh">Hent hånden igen</button></div>
    <p v-if="loading && !data" role="status" class="note">Finder din plads ved bordet…</p>
    <section class="table" :class="{ dealing:animating, ['round-'+outcome]:completed }" aria-label="Bananjack spillebord" :aria-busy="busy || animating">
      <div class="dealer-label"><b>Emils hånd</b><span class="score">{{ dealerValue }}</span></div>
      <TransitionGroup v-if="game" name="jack-deal" tag="div" class="cards dealer"><JackCard v-for="(card,i) in game.dealer" :key="`${game.sequence}:dealer:${i}:${card===null?'hidden':'face'}`" :card="card" /></TransitionGroup><div v-else class="cards dealer"><JackCard :card="null" /><JackCard :card="null" /></div>
      <div class="table-caption">BANANJACK BETALER 3:2 <span>DEALER STÅR PÅ ALLE 17</span></div>
      <div v-if="game" class="hands">
        <section v-for="(hand,index) in game.hands" :key="`${game.sequence}:${index}`" class="hand" :class="{active:playing && index===game.active}">
          <div class="hand-label"><b>{{ game.hands.length > 1 ? `Hånd ${index+1}` : 'Din hånd' }}</b><div class="hand-value"><span class="score" :class="{bust:jackScore(hand.cards).total>21}">{{ hand.cards.length ? jackScore(hand.cards).total : '—' }}</span><small v-if="hand.cards.length && jackScore(hand.cards).soft">soft</small><small v-if="hand.result">{{ labels[hand.result] }}</small></div></div>
          <TransitionGroup name="jack-deal" tag="div" class="cards"><JackCard v-for="(card,i) in hand.cards" :key="`${game.sequence}:${index}:${i}:${card}`" :card="card" /></TransitionGroup><small>Indsats {{ hand.bet }} 🍌</small>
        </section>
      </div>
      <div v-else class="empty-hand"><img src="/marker.png" alt=""><p>Emil har blandet kortene.<br>Han ser meget sikker ud. Det gør han altid.</p></div>
    </section>
    <div v-if="completed" :key="game!.id" class="round-result" :class="outcome" role="status" aria-live="polite"><span class="result-kicker">Runden er slut</span><div><b>{{ resultText }}</b><strong>{{ net > 0 ? '+' : '' }}{{ net }} 🍌</strong></div><span>{{ game!.payout }} 🍌 udbetalt inkl. indsats</span></div>
    <div v-else class="status" role="status" aria-live="polite"><b>{{ animating ? caption : busy ? 'Kortene er på vej…' : resultText }}</b></div>
    <div v-if="playing" class="actions"><button v-for="action in (['hit','stand','double','split'] as const)" :key="action" :disabled="locked || !game?.actions.includes(action)" @click="play(action)">{{ {hit:'Træk kort',stand:'Stå',double:'Fordobl',split:'Split'}[action] }}</button><p>Fordobl: ét kort og stå. Maks. 50 🍌 pr. hånd.<span v-if="dailyLimit" class="limit-inline">Dagens indsatser: {{ dailyLimit.spent.toLocaleString('da-DK') }} / {{ dailyLimit.amount.toLocaleString('da-DK') }} 🍌</span></p></div>
    <div v-else-if="name && limitReached && !busy" class="daily-cap" role="status"><b>Dagens indsatsgrænse er nået</b><p>{{ dailyLimit!.spent.toLocaleString('da-DK') }} / {{ dailyLimit!.amount.toLocaleString('da-DK') }} 🍌 satset. Nye indsatser {{ resetTime }} dansk tid.</p><NuxtLink to="/spil">Se de daglige spil →</NuxtLink></div>
    <div v-else-if="name" class="bet-panel"><fieldset :disabled="busy || loading"><legend>Din indsats <span v-if="dailyLimit">{{ dailyLimit.remaining.toLocaleString('da-DK') }} / {{ dailyLimit.amount.toLocaleString('da-DK') }} 🍌 tilbage i dag</span></legend><div class="bets"><button v-for="amount in JACK_BETS" :key="amount" :aria-pressed="bet===amount" :class="{selected:bet===amount}" :disabled="!canBet(amount)" @click="bet=amount">{{ amount }} 🍌</button></div></fieldset><button class="deal-button" :disabled="locked || !canBet(bet)" @click="play('deal')">{{ game ? 'Spil næste hånd' : 'Giv kort' }} · {{ bet }} 🍌</button><NuxtLink v-if="data && data.balance < 10" class="note" to="/spil">Flere bananer? Tag dagens gratis spil →</NuxtLink></div>
    <dialog ref="rules" class="rules" @click="($event.target === rules) && rules?.close()"><div><button class="close" aria-label="Luk regler" @click="rules?.close()">✕</button><h2>Sådan spiller du Bananjack</h2><ul><li>Kom tættere på 21 end Emil. Over 21 taber.</li><li>Es er 1 eller 11. Billedkort er 10.</li><li>Seks kortspil blandes på ny til hver runde. Dealeren tjekker for blackjack og står på alle 17, også soft 17.</li><li>Bananjack er es + et 10-kort på de to første kort og giver 3:2. Almindelig sejr giver 1:1. Ved lige op får du indsatsen tilbage.</li><li>Vælg 10–50 bananer i trin på 10. Fordobl på de første to kort, hvis du har råd, og hånden højst kommer på 50. Du får ét kort og står.</li><li>Split to kort med samme værdi. Maks. fire hænder. Hver ekstra hånd koster samme indsats. Split-esser får kun ét kort hver. 21 efter split giver almindelig sejr.</li><li v-if="dailyLimit">Midlertidig grænse: {{ dailyLimit.amount.toLocaleString('da-DK') }} bananer i samlede indsatser pr. dag, inklusive split og fordobling. Gevinster giver ikke mere plads. Nulstilles kl. 04.00 dansk tid.</li><li>Ingen forsikring eller surrender. Din igangværende hånd gemmes, når du forlader siden.</li></ul><button class="deal-button" @click="rules?.close()">Tilbage til bordet</button></div></dialog>
  </div>
</template>

<style scoped>
.jack-page{max-width:480px;margin:auto;padding:calc(14px + var(--safe-t)) 16px calc(var(--nav-space) + 18px)}header,.title-row{display:flex;align-items:center;justify-content:space-between;gap:12px}.back-link,.balance{min-height:44px;display:flex;align-items:center;text-decoration:none;color:var(--text);font-size:13px}.balance{font-weight:750;font-variant-numeric:tabular-nums}h1{font-size:34px;letter-spacing:-.06em}h1 span{color:var(--accent)}button{cursor:pointer;font:inherit}.rules-button{min-height:44px;border:0;background:none;color:var(--muted);font-size:12px;text-decoration:underline}.table{margin-top:12px;border:1px solid #c7a35b66;border-radius:23px;background:radial-gradient(ellipse at 50% 30%,#28574a,#112f26);color:#fdf4db;padding:15px 12px;box-shadow:inset 0 0 0 5px #fff2}.dealer-label,.hand-label{display:flex;align-items:center;justify-content:space-between;gap:5px;font-size:12px}.dealer-label>span,.hand-label>span{font-variant-numeric:tabular-nums;color:#e9d699;font-size:11px}.cards{display:flex;justify-content:center;gap:0;min-height:88px;padding:7px 10px 0 0;overflow-x:auto}.cards>:not(:first-child){margin-left:-12px}.dealer{min-height:95px}.table-caption{text-align:center;margin:13px 0;color:#dfc384;font-size:9px;font-weight:700;letter-spacing:.08em}.table-caption span{display:block;margin-top:4px;font-size:8px;opacity:.8}.hands{display:grid;gap:8px}.hand{min-width:0;padding:8px;border:1px solid #fff2;border-radius:12px}.hand.active{border-color:#f3d58b;background:#fff1;box-shadow:0 0 0 1px #f3d58b22}.hand small{display:block;text-align:center;font-size:10px;color:#d7dfcf;margin-top:5px}.empty-hand{display:flex;align-items:center;justify-content:center;gap:13px;padding:13px 0}.empty-hand img{width:43px;height:52px;object-fit:contain}.empty-hand p{font-size:11px;line-height:1.6;color:#dbdfce}.status{display:flex;flex-direction:column;gap:4px;min-height:57px;justify-content:center;text-align:center;padding:10px 0}.status>b{font-size:17px}.status>span{font-size:11px;color:var(--muted)}fieldset{border:0;margin:0;padding:0}legend{font-size:11px;color:var(--muted);margin-bottom:7px}.bets{display:grid;grid-template-columns:repeat(5,1fr);gap:5px}.bets button,.actions>button{min-height:44px;border:1px solid var(--hairline);border-radius:11px;background:var(--surface);color:var(--text);font-size:12px;font-weight:700}.bets .selected{border-color:var(--accent);background:var(--accent-soft)}button:disabled{opacity:.4;cursor:default}.deal-button{display:block;width:100%;min-height:48px;margin-top:10px;border:1px solid #d3ad66;border-radius:12px;background:linear-gradient(135deg,#f3d890,#c89c4f);color:#2b2318;font-weight:800;font-size:14px}.actions{display:grid;grid-template-columns:1fr 1fr;gap:7px}.actions>button:first-child{background:var(--ink);color:white}.actions>p{grid-column:1/-1;text-align:center;font-size:10px;color:var(--muted);margin:2px 0}.note{display:block;font-size:12px;text-align:center;color:var(--muted);margin-top:12px;line-height:1.5}.login,.error{padding:12px;margin-top:10px;border-radius:12px;background:var(--accent-soft);font-size:12px;line-height:1.5}.error button{min-height:44px;background:none;border:0;text-decoration:underline;color:var(--text)}.rules{max-width:420px;width:calc(100% - 28px);max-height:85dvh;margin:auto;padding:20px;border:1px solid var(--hairline);border-radius:20px;background:var(--surface);color:var(--text);box-sizing:border-box}.rules::backdrop{background:#0009;backdrop-filter:blur(5px)}.rules h2{font-size:21px;margin:8px 30px 14px 0}.rules ul{padding-left:19px;font-size:12px;line-height:1.7}.rules li+li{margin-top:7px}.close{float:right;min-height:36px;min-width:36px;border:0;border-radius:50%;background:var(--surface-2);color:var(--text)}a:focus-visible,button:focus-visible{outline:2px solid var(--accent);outline-offset:3px}@media(max-width:350px){.jack-page{padding-left:12px;padding-right:12px}.table{padding:12px 9px}.bets button{font-size:11px}}


.dealer-label > .score,.hand-value .score{display:inline-flex;align-items:center;justify-content:center;min-width:48px;min-height:35px;padding:0 9px;border:1px solid #edce8566;border-radius:10px;background:#0b251c99;color:#fff3cd;font-size:26px;font-weight:850;line-height:1.15;font-variant-numeric:tabular-nums;white-space:nowrap}.hand-value{display:flex;align-items:center;justify-content:flex-end;gap:6px;flex-wrap:wrap}.hand-value small{margin:0;color:#f0db9f;font-size:10px}.hand-value .score.bust{background:#712d31;color:#ffe2dc;border-color:#f49b8b}.cards{position:relative;padding-top:10px;padding-bottom:5px;min-height:103px;overflow:visible;flex-wrap:wrap;row-gap:6px}.cards.dealer{min-height:103px}.jack-deal-enter-active{transition:transform .32s cubic-bezier(.18,.75,.25,1),opacity .2s}.jack-deal-enter-from{opacity:0;transform:translate(48px,-42px) rotate(16deg) scale(.82)}.jack-deal-leave-active{position:absolute;transition:opacity .12s}.jack-deal-leave-to{opacity:0}.jack-deal-move{transition:transform .3s ease}.table{transition:box-shadow .4s,border-color .4s}.table.round-win{border-color:#e9c674;box-shadow:inset 0 0 0 5px #e5c57833,0 0 24px #d7b76833}.table.round-lose{border-color:#ca7779;box-shadow:inset 0 0 0 5px #ca777922}.table.round-push{border-color:#a8b8cd}.round-result{margin:13px 0;padding:14px 15px;border:1px solid;border-radius:16px;animation:jack-result-in .4s cubic-bezier(.18,.8,.3,1.1)}.round-result.win{border-color:light-dark(#a78b39,#d0af5d);background:light-dark(#fff0bc,#3b3320)}.round-result.lose{border-color:light-dark(#bf7974,#a76468);background:light-dark(#fce9e6,#3c252d)}.round-result.push{border-color:light-dark(#9aa7ba,#6f7c98);background:light-dark(#edf0f8,#272e3e)}.result-kicker{font-size:9px;letter-spacing:.13em;text-transform:uppercase;font-weight:800;color:var(--muted)}.round-result>div{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:6px 0}.round-result b{font-size:21px;letter-spacing:-.03em}.round-result strong{font-size:27px;white-space:nowrap;letter-spacing:-.045em}.round-result>span:last-child{font-size:11px;line-height:1.5;color:var(--muted)}@keyframes jack-result-in{from{opacity:0;transform:translateY(9px) scale(.97)}to{opacity:1;transform:none}}@media(prefers-reduced-motion:reduce){.jack-deal-enter-active,.jack-deal-leave-active,.jack-deal-move,.table{transition:none}.round-result{animation:none}}


.table{padding-top:12px;padding-bottom:12px}.cards,.cards.dealer{min-height:96px;padding-top:6px;padding-bottom:2px}.table-caption{margin:8px 0}.hand{padding:6px}.round-result{padding:12px 14px}.round-result>div{margin:5px 0}.round-result b{font-size:20px}
</style>
<style scoped>
.bet-panel legend{width:100%;display:flex;justify-content:space-between;align-items:center;gap:6px}.bet-panel legend>span{font-size:10px;font-variant-numeric:tabular-nums}.limit-inline{display:block;margin-top:3px;font-variant-numeric:tabular-nums}.daily-cap{padding:14px 15px;border:1px solid var(--hairline);border-radius:15px;background:var(--surface);font-size:13px}.daily-cap p{font-size:11px;line-height:1.6;color:var(--muted);margin:7px 0}.daily-cap a{display:inline-flex;align-items:center;min-height:44px;color:var(--text);font-size:12px;font-weight:700;text-decoration:none}
</style>
