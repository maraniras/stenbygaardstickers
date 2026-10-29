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
const background = `conic-gradient(${WHEEL_SLOTS.map(s => `${s.color} ${s.start}deg ${s.end - .5}deg, #fff2 ${s.end - .5}deg ${s.end}deg`).join(',')})`
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
      <div class="wheel-stage">
        <div class="rim" aria-hidden="true" />
        <div class="disk" :class="{ spinning }" :style="{ background, '--spin-duration': WHEEL_SPIN_MS + 'ms', transform: `rotate(${rotation}deg)` }">
          <span v-for="segment in WHEEL_SLOTS" :key="segment.index" class="prize-label" :class="{ miv: segment.value === 0, grand: segment.value === 500 }" :style="{ left: `${50 + Math.sin(segment.middle * Math.PI / 180) * 39}%`, top: `${50 - Math.cos(segment.middle * Math.PI / 180) * 39}%`, transform: `translate(-50%, -50%) rotate(${segment.middle}deg)`, color: segment.ink }">{{ segment.value === 0 ? 'Miv' : segment.value }}<span v-if="segment.value === 500" class="tiny-star" aria-hidden="true">★</span></span>
        </div>
        <div class="wheel-gloss" aria-hidden="true" />
        <span v-for="n in 20" :key="n" class="bulb" :style="{ left: `${50 + Math.sin((n - 1) * Math.PI / 10) * 47}%`, top: `${50 - Math.cos((n - 1) * Math.PI / 10) * 47}%`, '--light-delay': `${n * -.12}s` }" aria-hidden="true" />
        <div class="hub"><span class="hub-orbit" aria-hidden="true">STENBYGAARD</span><img src="/marker.png" alt="Emil på lykkehjulet"><span class="hub-star" aria-hidden="true">★</span></div>
        <div class="pointer" aria-hidden="true"><svg viewBox="0 0 40 56"><defs><linearGradient id="wheel-pointer-gold" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff6c7"/><stop offset=".5" stop-color="#ffd979"/><stop offset="1" stop-color="#bd7d31"/></linearGradient></defs><path d="M5 4h30v21L20 51 5 25Z" fill="url(#wheel-pointer-gold)" stroke="#fff0ac" stroke-width="2"/><circle cx="20" cy="16" r="5" fill="#65422c"/><circle cx="19" cy="15" r="2" fill="#ffe7a3"/></svg></div>
      </div>
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
.wheel-stage { position:relative; width:100%; max-width:320px; aspect-ratio:1; margin:0 auto 18px; }.rim { position:absolute; inset:0; border-radius:50%; background:linear-gradient(145deg,#fff1b9 2%,#c28744 27%,#ffdb86 50%,#ac7139 77%,#ffe4a1); box-shadow:0 7px 0 #78502f,0 11px 0 #130e20,0 18px 24px #0e091e80,inset 0 0 0 2px #fff0b760; }.disk { position:absolute; inset:15px; border:3px solid #30243b; border-radius:50%; box-shadow:0 0 0 2px #ffeab280; }.disk.spinning { transition:transform var(--spin-duration) cubic-bezier(.12,.72,.12,1); }.prize-label { position:absolute; display:flex; align-items:center; justify-content:center; color:#241637; font-size:13px; font-weight:800; line-height:1; white-space:nowrap; }.prize-label.miv { font-size:11px; font-weight:600; letter-spacing:.02em; }.prize-label.grand { font-size:15px; }.tiny-star { position:absolute; top:20px; font-size:9px; }
.wheel-gloss { position:absolute; pointer-events:none; inset:18px; border-radius:50%; background:linear-gradient(155deg,#fff3 0%,transparent 38%,#0001 70%); box-shadow:inset 0 0 20px #1b10214d; }.bulb { position:absolute; z-index:2; width:7px; height:7px; transform:translate(-50%,-50%); border-radius:50%; background:#fff4bf; border:1px solid #ffdf86; box-shadow:0 0 5px #fff1ab,0 0 10px #ffc25790; }.running .bulb { animation:chase .65s ease-in-out infinite alternate; animation-delay:var(--light-delay); }@keyframes chase { to { background:#977047; box-shadow:0 0 1px #fdd47b; } }
.hub { position:absolute; z-index:3; top:50%; left:50%; transform:translate(-50%,-50%); display:grid; place-items:center; width:80px; height:80px; border:4px solid #e8bd76; border-radius:50%; background:radial-gradient(circle at 35% 20%,#514260,#211a31 75%); box-shadow:0 4px 10px #130b2990,inset 0 0 0 2px #fff1; }.hub img { width:52px; height:57px; margin-top:6px; object-fit:contain; filter:drop-shadow(0 3px 3px #0005); }.hub-orbit { position:absolute; top:8px; color:#e8cc99; font-size:6px; font-weight:800; letter-spacing:.11em; }.hub-star { position:absolute; bottom:-5px; display:grid; place-items:center; width:19px; height:19px; border-radius:50%; background:#e8bd76; color:#382437; font-size:10px; }.pointer { position:absolute; z-index:4; top:-16px; left:50%; width:35px; height:50px; transform:translateX(-50%); filter:drop-shadow(0 4px 3px #130b2980); }.pointer svg { display:block; width:100%; height:100%; }
.machine-foot { display:flex; align-items:center; gap:6px; margin:0 -12px; min-height:41px; padding:10px 17px; border-top:1px solid #ffffff10; background:#100b1b50; color:#c5b9d3; font-size:9px; }.status-dot { flex:none; width:5px; height:5px; border-radius:50%; background:#9aca98; box-shadow:0 0 6px #9aca9860; }.status-dot.active { background:#ffd979; }.serial { margin-left:auto; color:#796b8b; font-size:8px; letter-spacing:.1em; }
.play { display:flex; align-items:center; gap:12px; width:100%; min-height:68px; margin-top:18px; padding:12px 19px; border:1px solid #fff4; border-radius:18px; background:linear-gradient(120deg,#d7ef9b,#bde487); box-shadow:0 4px 0 #769847,0 9px 18px #182e1420,inset 0 1px 0 #fff8; color:#263c27; cursor:pointer; text-align:left; font:inherit; font-size:18px; font-weight:800; }.play > svg { width:25px; height:25px; fill:none; stroke:currentColor; stroke-width:1.8; stroke-linecap:round; stroke-linejoin:round; }.play small { display:block; margin-top:3px; color:#4c6746; font-size:10px; font-weight:500; }.play-arrow { margin-left:auto; font-size:24px; }.play:disabled { cursor:wait; }.play:active:not(:disabled) { transform:translateY(2px); box-shadow:0 2px 0 #769847; }
.result { margin-top:18px; padding:20px 18px; border:1px solid var(--hairline); border-radius:22px; background:var(--surface); text-align:center; }.result-label { font-size:9px; letter-spacing:.15em; text-transform:uppercase; color:var(--muted); }.result h2 { margin-top:7px; font-size:22px; }.result strong { display:flex; align-items:center; justify-content:center; gap:5px; margin-top:8px; font-size:40px; letter-spacing:-.05em; }.result strong img { width:35px; height:35px; object-fit:contain; }.result p { margin:7px auto 0; max-width:265px; color:var(--muted); font-size:11px; line-height:1.7; }.result.big { background:linear-gradient(135deg,#fff2c4,#e8c56f); color:#4a321e; }.result.big p,.result.big .result-label { color:#76552d; }.result.miv strong { color:var(--muted); }
.stats { display:flex; justify-content:center; align-items:center; gap:25px; padding:25px 0 16px; }.stats > div { display:flex; align-items:center; gap:7px; }.stats b { font-size:19px; }.stats div > span { color:var(--muted); font-size:10px; }.stats-divider { height:19px; width:1px; background:var(--hairline); }
.status { padding:20px 0; text-align:center; color:var(--muted); font-size:13px; }.odds { margin-top:23px; padding:16px; border:1px solid var(--hairline); border-radius:18px; background:var(--surface); }.odds summary { display:flex; align-items:center; justify-content:space-between; min-height:28px; font-size:12px; font-weight:700; cursor:pointer; list-style:none; }.odds summary::-webkit-details-marker { display:none; }.odds summary > span { color:var(--muted); font-size:18px; }.odds[open] summary > span { transform:rotate(45deg); }.odds p,.odds small { color:var(--muted); font-size:11px; line-height:1.7; }.odds ul { list-style:none; padding:0; }.odds li { display:flex; justify-content:space-between; align-items:center; padding:8px 0; font-size:12px; border-bottom:1px solid var(--hairline); }.odds li > span { display:flex; align-items:center; gap:8px; }.odds i { width:10px; height:10px; border-radius:50%; }.error { color:var(--muted); font-size:12px; }a:focus-visible,button:focus-visible,summary:focus-visible { outline:3px solid var(--text); outline-offset:3px; }
@media(max-width:350px) { .wheel-page { padding-left:12px; padding-right:12px; }h1 { font-size:27px; }.arcade { padding-left:9px; padding-right:9px; }.machine-foot { margin-left:-9px; margin-right:-9px; padding-left:12px; padding-right:12px; }.serial { display:none; }.prize-label { font-size:11px; }.prize-label.miv { font-size:10px; }.prize-label.grand { font-size:13px; }.hub { width:70px; height:70px; }.hub img { width:45px; height:50px; }.hub-orbit { top:6px; font-size:5px; }.stats { gap:16px; }.stats div > span { font-size:9px; } }
@media(prefers-reduced-motion:reduce) { .disk.spinning { transition-duration:.1s; }.running .bulb { animation:none; } }
</style>