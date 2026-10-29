<script setup lang="ts">
useHead({ title: 'Emil er faret vild · Stenbygaard Stickers' })
const { name, ready } = useUser()
const { state, error: walletError, reload, guess } = useEconomy()
const busy = ref(false)
const error = ref('')
const image = ref('')
const imageLoading = ref(false)
const imageError = ref('')
let revision = 0
let alive = true
const city = computed(() => state.value?.city)
const remaining = computed(() => 5 - (city.value?.guesses.length ?? 0))
const lastWrong = computed(() => {
  const last = city.value?.guesses.at(-1)
  return !city.value?.won && last ? city.value?.options.find(o => o.id === last)?.name : undefined
})
async function loadImage() {
  const day = state.value?.day
  if (!day || !name.value) return
  const request = ++revision
  imageLoading.value = true
  imageError.value = ''
  try {
    const blob = await $fetch<Blob>('/api/games/city/image', { query: { day, revision: city.value?.guesses.length ?? 0 }, headers: { 'x-user-token': userToken() }, responseType: 'blob', timeout: 25_000, retry: 0, cache: 'no-store' })
    if (!alive || request !== revision) return
    if (image.value) URL.revokeObjectURL(image.value)
    image.value = URL.createObjectURL(blob)
  }
  catch { if (alive && request === revision) imageError.value = 'Luftfotoet kunne ikke hentes. Prøv igen — det bruger ikke et gæt.' }
  finally { if (alive && request === revision) imageLoading.value = false }
}
watch([() => state.value?.day, () => city.value?.guesses.length], loadImage, { immediate: true })
watch(() => state.value?.day, () => { error.value = '' })
onBeforeUnmount(() => { alive = false; revision++; if (image.value) URL.revokeObjectURL(image.value) })
async function choose(id: string) {
  if (busy.value || city.value?.finished || !image.value || imageLoading.value || imageError.value) return
  busy.value = true
  error.value = ''
  try { await guess(id) }
  catch (e: any) { error.value = e?.data?.statusMessage || 'Dit gæt kunne ikke gemmes. Hent spillet igen før du prøver videre.'; await reload() }
  finally { busy.value = false }
}
</script>
<template>
  <div class="city-page"><div class="top"><NuxtLink to="/spil">← Dagens spil</NuxtLink><NuxtLink v-if="state" to="/spil/bananer">🍌 {{ state.wallet.balance.toLocaleString('da-DK') }}</NuxtLink></div><header><span class="eyebrow">Dagens hovedstad</span><h1>Emil er faret vild</h1><p>Et luftfoto. Seks byer. Emil har ingen anelse.</p></header>
    <div v-if="ready && !name" class="login"><p>Vælg dit navn for at gemme dine forsøg og vinde bananer.</p><NuxtLink class="btn" to="/mig">Vælg mit navn</NuxtLink></div>
    <div v-else-if="!state" class="login" role="status"><p>{{ walletError || 'Finder dagens by…' }}</p><button v-if="walletError" class="btn secondary" @click="reload">Prøv igen</button></div>
    <template v-else>
      <div class="aerial" :aria-busy="imageLoading"><img v-if="image" :src="image" class="photo" alt="Luftfoto af dagens hemmelige by"><div v-if="image && !imageError" class="emil"><img src="/marker.png" alt="Emil er placeret midt i billedet"></div><div v-if="imageLoading || imageError" class="image-status" role="status"><p>{{ imageError || 'Henter luftfoto…' }}</p><button v-if="imageError" class="btn secondary" @click="loadImage">Hent billedet igen</button></div><span class="zoom">{{ ['Helt tæt på', 'Lidt længere væk', 'Byen fra oven', 'Det store overblik', 'Sidste ledetråd'][Math.min(4, city!.guesses.length)] }}</span></div>
      <p class="attribution">Luftfoto © Esri, Maxar, Earthstar Geographics · Navne: GeoNames</p>
      <div class="attempts"><span v-for="n in 5" :key="n" :class="{ used: n <= city!.guesses.length, won: city!.won && n === city!.guesses.length }" /><b>{{ city!.finished ? `${city!.guesses.length} af 5 gæt` : `${remaining} gæt tilbage` }}</b></div>
      <div v-if="city!.finished" class="result" :class="{ won: city!.won }" role="status"><span class="result-emoji">{{ city!.won ? '🎯' : '🧭' }}</span><h2>{{ city!.won ? 'Du fandt Emil!' : 'Emil slipper afsted i dag' }}</h2><p>Han var i <b>{{ city!.answer?.name }}</b>.</p><strong>{{ city!.won ? `+${city!.reward} 🍌` : 'En ny chance i morgen' }}</strong><small v-if="city!.won">Eventuelle badgebonusser er også lagt i dit bananlager.</small></div>
      <p v-else class="question" role="status">{{ busy ? 'Gemmer dit gæt…' : lastWrong ? `Ikke ${lastWrong}. Vi zoomer ud — prøv igen.` : 'Hvilken by hænger Emil i?' }}</p>
      <div class="options"><button v-for="option in city!.options" :key="option.id" :disabled="busy || city!.finished || imageLoading || !!imageError || !image || city!.guesses.includes(option.id)" :class="{ wrong: city!.guesses.includes(option.id) && option.id !== city!.answer?.id, correct: option.id === city!.answer?.id }" @click="choose(option.id)">{{ option.name }}<span v-if="option.id === city!.answer?.id" aria-label="Rigtigt svar">✓</span><span v-else-if="city!.guesses.includes(option.id)" aria-label="Forkert gæt">×</span></button></div>
      <p v-if="error" class="error" role="alert">{{ error }}</p><p class="rewards">Rigtigt på 1.–5. gæt: <b>50 · 40 · 30 · 20 · 10 🍌</b></p><DailyResetCountdown :at="state.nextResetAt" />
    </template>
  </div>
</template>
<style scoped>
.city-page { max-width: 560px; margin: 0 auto; padding: calc(15px + var(--safe-t)) 16px calc(var(--nav-space) + 18px); }.top { display: flex; align-items: center; justify-content: space-between; gap: 12px; }.top a { display: flex; align-items: center; min-height: 44px; color: var(--muted); text-decoration: none; font-size: 12px; }.top a:last-child { font-weight: 700; }header { margin: 17px 0 20px; }header .eyebrow { font-size: 10px; }h1 { margin-top: 7px; font-size: 29px; }header p { color: var(--muted); font-size: 12px; }.aerial { position: relative; overflow: hidden; aspect-ratio: 10 / 7; border-radius: 22px; background: var(--surface-2); box-shadow: var(--shadow-sm); }.photo { width: 100%; height: 100%; object-fit: cover; }.emil { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -60%); }.emil img { display: block; width: 42px; height: 52px; object-fit: contain; filter: drop-shadow(0 3px 4px #0008); }.image-status { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 18px; background: var(--glass); text-align: center; font-size: 13px; }.zoom { position: absolute; bottom: 10px; left: 10px; padding: 4px 8px; border-radius: 7px; background: #101b28cc; color: #fff; font-size: 10px; }.attribution { color: var(--muted); font-size: 9px; margin: 7px 2px 0; }.attempts { display: flex; align-items: center; gap: 5px; margin: 18px 0; }.attempts > span { width: 18px; height: 5px; border-radius: 9px; background: var(--surface-2); }.attempts > span.used { background: var(--muted); }.attempts > span.won { background: var(--accent); }.attempts b { margin-left: auto; font-size: 11px; color: var(--muted); }.question { margin: 18px 0 12px; font-size: 14px; font-weight: 700; }.options { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; }.options button { display: flex; justify-content: space-between; align-items: center; gap: 5px; min-height: 53px; padding: 11px 12px; border: 1px solid var(--hairline); border-radius: 13px; background: var(--surface); color: var(--text); font: inherit; font-size: 13px; font-weight: 700; text-align: left; cursor: pointer; overflow-wrap: anywhere; }.options button:disabled { cursor: default; }.options button:disabled:not(.correct):not(.wrong) { opacity: .6; }.options .wrong { color: var(--muted); background: var(--surface-2); text-decoration: line-through; }.options .correct { color: var(--on-accent); background: var(--accent); border-color: var(--accent); }.rewards { color: var(--muted); margin-top: 19px; text-align: center; font-size: 10px; }.rewards b { color: var(--text); }.result { margin: 12px 0 20px; padding: 19px 14px; border-radius: 20px; background: var(--surface); text-align: center; }.result.won { background: var(--accent-soft); }.result-emoji { font-size: 28px; }h2 { margin-top: 8px; font-size: 23px; }.result p { margin: 8px 0; color: var(--muted); font-size: 13px; }.result strong { display: block; font-size: 23px; }.result small { display: block; margin-top: 7px; color: var(--muted); font-size: 11px; }.login { padding: 20px 0; color: var(--muted); font-size: 14px; }.error { color: var(--muted); font-size: 12px; }button:focus-visible,a:focus-visible { outline: 3px solid var(--text); outline-offset: 3px; }
</style>
