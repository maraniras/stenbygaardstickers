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
const segments = computed(() => {
  let start = 0
  return WHEEL_PRIZES.map(p => { const result = { ...p, start, middle: (start + p.weight / 2) / 10000 * 360 }; start += p.weight; return result })
})
const background = computed(() => `conic-gradient(${segments.value.map(s => `${s.color} ${s.start / 100}%, ${s.color} ${(s.start + s.weight) / 100}%`).join(',')})`)
const target = (value: number) => 360 - segments.value.find(p => p.value === value)!.middle
watch(prize, value => { if (value !== undefined && !spinning.value) rotation.value = target(value) }, { immediate: true })
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
    rotation.value = Math.ceil(rotation.value / 360) * 360 + 360 * 5 + target(value)
    const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 100 : 3200
    await new Promise<void>(resolve => { const timer = setTimeout(resolve, duration); finishAnimation = () => { clearTimeout(timer); resolve() } })
    if (alive && value === 500) shootConfetti()
  }
  catch (e: any) { if (alive) { error.value = e?.data?.statusMessage || 'Svaret kunne ikke hentes. Vi tjekker dit gemte spin.'; await reload() } }
  finally { if (alive) spinning.value = false; animation.value = false }
}
</script>
<template>
  <div class="wheel-page"><div class="top"><NuxtLink to="/spil">← Dagens spil</NuxtLink><NuxtLink v-if="state" to="/spil/bananer">🍌 {{ state.wallet.balance.toLocaleString('da-DK') }}</NuxtLink></div><header><span class="eyebrow">Lidt held skal man have</span><h1>Dagens lykkehjul</h1><p>Ét gratis spin. Bananer eller bare… øv.</p></header>
    <div class="wheel-stage"><span class="spark one" aria-hidden="true">✦</span><span class="spark two" aria-hidden="true">✧</span><div class="disk" :class="{ spinning }" :style="{ background, transform: `rotate(${rotation}deg)` }"><span v-for="segment in segments.filter(s => s.weight >= 500)" :key="segment.value" class="prize-label" :style="{ transform: `translate(-50%, -50%) rotate(${segment.middle}deg) translateY(-105px) rotate(${-segment.middle}deg)` }">{{ segment.value === 0 ? 'ØV' : segment.value }}</span></div><div class="hub"><img src="/marker.png" alt="Emil på lykkehjulet"></div><span class="pointer" aria-hidden="true" /></div>
    <div v-if="ready && !name" class="status"><p>Vælg dit navn, så dit spin og dine bananer bliver gemt.</p><NuxtLink class="btn" to="/mig">Vælg mit navn</NuxtLink></div><div v-else-if="!state" class="status"><p>{{ walletError || 'Henter dit daglige spin…' }}</p><button v-if="walletError" class="btn secondary" @click="reload">Prøv igen</button></div>
    <template v-else><div v-if="state.wheel && !spinning" class="result" role="status"><h2>{{ prize === 500 ? 'JACKPOT!' : prize === 0 ? 'En vaskeægte nitte' : prize === 1 ? 'Én er bedre end ingen' : 'Bananer til lageret!' }}</h2><strong>{{ prize ? `+${prize} 🍌` : '0 🍌' }}</strong><p>{{ prize ? 'Gevinsten er gemt på din bruger. Eventuelle badgebonusser kommer oveni.' : 'Det kostede ikke noget at prøve. Kom igen i morgen.' }}</p></div><button v-else class="btn play" :disabled="spinning" @click="play">{{ spinning ? 'Hjulet drejer…' : 'Spind gratis' }}</button><p v-if="error" class="error" role="alert">{{ error }}</p><p class="streak">🔥 {{ state.wallet.stats.wheelStreak }} spildøgn i træk · {{ state.wallet.stats.wheelSpins }} spins i alt</p><DailyResetCountdown :at="state.nextResetAt" /></template>
    <details class="odds"><summary>Gevinster og chancer</summary><p>Felternes størrelse følger chancen. Selv en enkelt banan er en gevinst.</p><ul><li v-for="p in WHEEL_PRIZES" :key="p.value"><span><i :style="{ background: p.color }" />{{ p.value ? `${p.value} 🍌` : 'Nitte' }}{{ p.value === 500 ? ' · jackpot' : '' }}</span><b>{{ (p.weight / 100).toLocaleString('da-DK') }} %</b></li></ul><small>Ét spin pr. bruger pr. spildøgn. Nyt spin kl. 04.00 dansk tid.</small></details>
  </div>
</template>
<style scoped>
.wheel-page { max-width: 480px; margin: 0 auto; padding: calc(15px + var(--safe-t)) 18px calc(var(--nav-space) + 20px); }.top { display: flex; align-items: center; justify-content: space-between; gap: 12px; }.top a { display: flex; align-items: center; min-height: 44px; color: var(--muted); font-size: 12px; text-decoration: none; }header { margin: 18px 0 0; text-align: center; }header .eyebrow { font-size: 10px; }h1 { margin-top: 7px; font-size: 30px; }header p { font-size: 13px; color: var(--muted); }.wheel-stage { position: relative; display: grid; place-items: center; width: 100%; height: 320px; margin: 10px auto 8px; }.disk { position: relative; width: 280px; height: 280px; border: 9px solid #ffd66c; border-radius: 50%; box-shadow: 0 8px 0 #a66e3d, 0 18px 35px #2416372b; }.disk.spinning { transition: transform 3.2s cubic-bezier(.12,.65,.12,1); }.prize-label { position: absolute; top: 50%; left: 50%; display: grid; place-items: center; width: 30px; height: 30px; color: #241637; font-size: 20px; font-weight: 800; }.prize-label:first-child { color: #fff; }.hub { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); display: grid; place-items: center; width: 70px; height: 70px; border-radius: 50%; background: #fff0ba; box-shadow: 0 2px 8px #34224e66; }.hub img { width: 54px; height: 61px; object-fit: contain; }.pointer { position: absolute; top: 11px; left: 50%; width: 29px; height: 38px; background: #fff0ba; clip-path: polygon(0 0, 100% 0, 50% 100%); transform: translateX(-50%); }.spark { position: absolute; color: var(--accent); font-size: 26px; }.one { top: 10%; left: 3%; }.two { bottom: 6%; right: 1%; font-size: 35px; }.status { padding: 14px 0; text-align: center; color: var(--muted); font-size: 13px; }.play { display: flex; width: 100%; margin-top: 10px; background: var(--accent); color: var(--on-accent); }.result { padding: 18px 14px; border-radius: 20px; background: var(--accent-soft); text-align: center; }.result h2 { font-size: 23px; }.result strong { display: block; margin-top: 8px; font-size: 35px; }.result p { margin: 9px 0 0; color: var(--muted); font-size: 12px; }.streak { margin-top: 20px; text-align: center; color: var(--muted); font-size: 11px; }.odds { margin-top: 25px; padding: 16px; border-radius: 18px; background: var(--surface); }.odds summary { min-height: 30px; font-size: 13px; font-weight: 700; cursor: pointer; }.odds p,.odds small { color: var(--muted); font-size: 11px; }.odds ul { list-style: none; padding: 0; }.odds li { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; font-size: 12px; border-bottom: 1px solid var(--hairline); }.odds li > span { display: flex; align-items: center; gap: 8px; }.odds i { width: 10px; height: 10px; border-radius: 50%; }.error { color: var(--muted); font-size: 12px; }a:focus-visible,button:focus-visible,summary:focus-visible { outline: 3px solid var(--text); outline-offset: 3px; }
@media (max-width:350px) { .wheel-page { padding-right: 14px; padding-left: 14px; }.wheel-stage { transform: scale(.9); height: 290px; } }
@media (prefers-reduced-motion:reduce) { .disk.spinning { transition-duration: .1s; } }
</style>
