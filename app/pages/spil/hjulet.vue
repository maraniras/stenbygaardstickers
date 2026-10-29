<script setup lang="ts">
import { WHEEL_PRIZES } from '../../../shared/utils/economy'
useHead({ title: 'Dagens lykkehjul · Stenbygaard Stickers' })
const { name, ready } = useUser()
const { state, error: walletError, reload, spin } = useEconomy()
const spinning = ref(false)
const error = ref('')
const rotation = ref(0)
const animation = useState('daily-game-animation', () => false)
let alive = true
let finishAnimation: (() => void) | undefined
const prize = computed(() => state.value?.wheel?.prize)
watch(prize, value => { if (value !== undefined && !spinning.value) rotation.value = wheelTarget(value) }, { immediate: true })
onBeforeUnmount(() => { alive = false; finishAnimation?.(); animation.value = false })
async function play() {
  if (spinning.value || !state.value || state.value.wheel) return
  spinning.value = true
  animation.value = true
  error.value = ''
  try {
    const response = await spin()
    if (!alive) return
    const value = response.wheel!.prize
    rotation.value = Math.ceil(rotation.value / 360) * 360 + 360 * 9 + wheelTarget(value, Math.random())
    const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 100 : WHEEL_SPIN_MS
    await new Promise<void>(resolve => { const timer = setTimeout(resolve, duration); finishAnimation = () => { clearTimeout(timer); resolve() } })
    if (alive && value === 500) shootConfetti()
  }
  catch (e: any) { if (alive) { error.value = e?.data?.statusMessage || 'Svaret kunne ikke hentes. Vi tjekker dit gemte spin.'; await reload() } }
  finally { if (alive) spinning.value = false; animation.value = false }
}
</script>
<template>
  <div class="wheel-page">
    <div class="top"><NuxtLink to="/spil">← Dagens spil</NuxtLink><NuxtLink v-if="state" class="balance" to="/spil/bananer"><img src="/badges/banana-baron.webp" alt="Bananer">{{ state.wallet.balance.toLocaleString('da-DK') }}</NuxtLink></div>
    <header><span class="eyebrow">Dit daglige skud held</span><h1>Dagens lykkehjul<span>.</span></h1><p>Emil drejer. Skæbnen bestemmer. Måske Miv.</p></header>

    <section class="arcade" :class="{ running: spinning, jackpot: prize === 500 && !spinning }" aria-label="Lykkehjulet">
      <div class="marquee"><span class="marquee-star" aria-hidden="true">✦</span><div><span class="jackpot-label">Dagens jackpot</span><b>500 <img src="/badges/banana-baron.webp" alt="bananer"></b></div><span class="marquee-star" aria-hidden="true">✦</span></div>
      <WheelFace :rotation="rotation" :spinning="spinning" />
      <div class="machine-foot"><span class="status-dot" :class="{ active: spinning }" aria-hidden="true" /><span>{{ spinning ? 'Emil har sluppet kontrollen…' : state?.wheel ? 'Tak for i dag. Emil lukker butikken.' : 'Ét gratis spin · hver dag' }}</span><span class="serial" aria-hidden="true">SBG—01</span></div>
    </section>

    <div v-if="ready && !name" class="status"><p>Vælg dit navn, så dit spin og dine bananer bliver gemt.</p><NuxtLink class="btn" to="/mig">Vælg mit navn</NuxtLink></div>
    <div v-else-if="!state" class="status"><p>{{ walletError || 'Henter dit daglige spin…' }}</p><button v-if="walletError" class="btn secondary" @click="reload">Prøv igen</button></div>
    <template v-else>
      <div v-if="state.wheel && !spinning" class="result" :class="{ big: prize === 500, miv: prize === 0 }" role="status"><span class="result-label">Dagens resultat</span><h2>{{ prize === 500 ? 'JACKPOT!' : prize === 0 ? 'Miv…' : prize === 1 ? 'Én er bedre end ingen' : 'Direkte på lageret!' }}</h2><strong>{{ prize ? `+${prize}` : '0' }}<img src="/badges/banana-baron.webp" alt="bananer"></strong><p>{{ prize ? 'Gevinsten er gemt. Eventuelle badgebonusser kommer oveni.' : 'Ingen bananer denne gang. Emil påtager sig intet ansvar.' }}</p></div>
      <button v-else class="play" :disabled="spinning" @click="play"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 8a8 8 0 1 0 1 7M19 3v5h-5"/></svg><span>{{ spinning ? 'Kom så, Emil…' : 'Drej hjulet' }}<small>{{ spinning ? 'Lidt spænding må der være' : 'Gratis · ingen indsats' }}</small></span><span class="play-arrow" aria-hidden="true">↗</span></button>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <div class="stats"><div><b>{{ state.wallet.stats.wheelStreak }}</b><span>spildøgn i træk</span></div><span class="stats-divider" aria-hidden="true" /><div><b>{{ state.wallet.stats.wheelSpins }}</b><span>spins i alt</span></div></div>
      <DailyResetCountdown :at="state.nextResetAt" />
    </template>
    <details class="odds"><summary>Hvad kan jeg vinde?<span aria-hidden="true">＋</span></summary><p>Alle felter er lige store, men har forskellige chancer. De præcise gevinstchancer står herunder.</p><ul><li v-for="p in WHEEL_PRIZES" :key="p.value"><span><i :style="{ background: wheelColor(p.value) }" />{{ p.value ? `${p.value} 🍌` : 'Miv' }}{{ p.value === 500 ? ' · jackpot' : '' }}</span><b>{{ (p.weight / 100).toLocaleString('da-DK') }} %</b></li></ul><small>Ét spin pr. bruger pr. spildøgn. Nyt spin kl. 04.00 dansk tid.</small></details>
  </div>
</template>
<style scoped>
.wheel-page { max-width:480px; margin:auto; padding:calc(12px + var(--safe-t)) 18px calc(var(--nav-space) + 24px); }
.top { display:flex; align-items:center; justify-content:space-between; gap:12px; }.top a { display:flex; align-items:center; min-height:44px; color:var(--muted); font-size:12px; text-decoration:none; }.top .balance { gap:5px; color:var(--text); font-weight:800; font-variant-numeric:tabular-nums; }.balance img { width:24px; height:24px; object-fit:contain; }
header { margin:19px 0 24px; }header .eyebrow { font-size:9px; letter-spacing:.16em; }h1 { margin-top:7px; font-size:30px; letter-spacing:-.055em; }h1 > span { color:var(--accent); }header p { margin:9px 0 0; font-size:12px; color:var(--muted); }
.arcade { position:relative; isolation:isolate; overflow:hidden; padding:20px 12px 0; border:1px solid #fff2; border-radius:28px; background:radial-gradient(ellipse at 50% 45%,#57417080,transparent 66%),repeating-linear-gradient(0deg,#ffffff02 0 1px,transparent 1px 4px),#201b30; box-shadow:0 12px 30px #130e2225,inset 0 1px 0 #ffffff24; }.arcade::before { content:''; position:absolute; z-index:-1; top:35%; left:15%; width:70%; aspect-ratio:1; background:#b999ff20; filter:blur(28px); border-radius:50%; }.arcade.jackpot { box-shadow:0 0 35px #ffcf5f50; border-color:#ffd979; }
.marquee { display:flex; align-items:center; justify-content:center; gap:30px; margin-bottom:20px; text-align:center; }.jackpot-label { display:block; color:#c5b4d8; text-transform:uppercase; font-size:9px; font-weight:700; letter-spacing:.22em; }.marquee b { display:flex; justify-content:center; align-items:center; gap:5px; margin-top:2px; color:#ffe29b; font-size:38px; font-weight:800; line-height:1.15; letter-spacing:-.055em; text-shadow:0 2px 14px #ffda8540; }.marquee img { width:34px; height:34px; object-fit:contain; }.marquee-star { font-size:20px; color:#c69a65; }
.machine-foot { display:flex; align-items:center; gap:6px; margin:0 -12px; min-height:41px; padding:10px 17px; border-top:1px solid #ffffff10; background:#100b1b50; color:#c5b9d3; font-size:9px; }.status-dot { flex:none; width:5px; height:5px; border-radius:50%; background:#9aca98; box-shadow:0 0 6px #9aca9860; }.status-dot.active { background:#ffd979; }.serial { margin-left:auto; color:#796b8b; font-size:8px; letter-spacing:.1em; }
.play { display:flex; align-items:center; gap:12px; width:100%; min-height:68px; margin-top:18px; padding:12px 19px; border:1px solid #fff4; border-radius:18px; background:linear-gradient(145deg,#fff0bb,#edc477 45%,#d3a15a); box-shadow:0 4px 0 #81572f,0 9px 18px #1a10222b,inset 0 1px 0 #fff8; color:#3b2930; cursor:pointer; text-align:left; font:inherit; font-size:18px; font-weight:800; }.play > svg { width:25px; height:25px; fill:none; stroke:currentColor; stroke-width:1.8; stroke-linecap:round; stroke-linejoin:round; }.play small { display:block; margin-top:3px; color:#755334; font-size:10px; font-weight:500; }.play-arrow { margin-left:auto; font-size:24px; }.play:disabled { cursor:wait; }.play:active:not(:disabled) { transform:translateY(2px); box-shadow:0 2px 0 #81572f; }
.result { margin-top:18px; padding:20px 18px; border:1px solid var(--hairline); border-radius:22px; background:var(--surface); text-align:center; }.result-label { font-size:9px; letter-spacing:.15em; text-transform:uppercase; color:var(--muted); }.result h2 { margin-top:7px; font-size:22px; }.result strong { display:flex; align-items:center; justify-content:center; gap:5px; margin-top:8px; font-size:40px; letter-spacing:-.05em; }.result strong img { width:35px; height:35px; object-fit:contain; }.result p { margin:7px auto 0; max-width:265px; color:var(--muted); font-size:11px; line-height:1.7; }.result.big { background:linear-gradient(135deg,#fff2c4,#e8c56f); color:#4a321e; }.result.big p,.result.big .result-label { color:#76552d; }.result.miv strong { color:var(--muted); }
.stats { display:flex; justify-content:center; align-items:center; gap:25px; padding:25px 0 16px; }.stats > div { display:flex; align-items:center; gap:7px; }.stats b { font-size:19px; }.stats div > span { color:var(--muted); font-size:10px; }.stats-divider { height:19px; width:1px; background:var(--hairline); }
.status { padding:20px 0; text-align:center; color:var(--muted); font-size:13px; }.odds { margin-top:23px; padding:16px; border:1px solid var(--hairline); border-radius:18px; background:var(--surface); }.odds summary { display:flex; align-items:center; justify-content:space-between; min-height:28px; font-size:12px; font-weight:700; cursor:pointer; list-style:none; }.odds summary::-webkit-details-marker { display:none; }.odds summary > span { color:var(--muted); font-size:18px; }.odds[open] summary > span { transform:rotate(45deg); }.odds p,.odds small { color:var(--muted); font-size:11px; line-height:1.7; }.odds ul { list-style:none; padding:0; }.odds li { display:flex; justify-content:space-between; align-items:center; padding:8px 0; font-size:12px; border-bottom:1px solid var(--hairline); }.odds li > span { display:flex; align-items:center; gap:8px; }.odds i { width:10px; height:10px; border-radius:50%; }.error { color:var(--muted); font-size:12px; }a:focus-visible,button:focus-visible,summary:focus-visible { outline:3px solid var(--text); outline-offset:3px; }
@media(max-width:350px) { .wheel-page { padding-left:12px; padding-right:12px; }h1 { font-size:27px; }.arcade { padding-left:9px; padding-right:9px; }.machine-foot { margin-left:-9px; margin-right:-9px; padding-left:12px; padding-right:12px; }.serial { display:none; }.stats { gap:16px; }.stats div > span { font-size:9px; } }
</style>