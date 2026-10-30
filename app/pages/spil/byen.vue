<script setup lang="ts">
useHead({ title: 'Emil er faret vild · Stenbygaard Stickers' })
const { name, ready } = useUser()
const { state, error: walletError, reload, guess } = useEconomy()
const busy = ref(false)
const error = ref('')
const rulesDialog = ref<HTMLDialogElement>()
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
  <div class="city-page">
    <div class="top"><NuxtLink class="game-back" to="/spil" aria-label="Dagens spil">←</NuxtLink><h1>Emil er faret vild</h1><NuxtLink v-if="state" class="balance" to="/spil/bananer">🍌 {{ state.wallet.balance.toLocaleString('da-DK') }}</NuxtLink></div>
    <div v-if="ready && !name" class="login"><p>Vælg dit navn for at gemme dine forsøg og vinde bananer.</p><NuxtLink class="btn" to="/mig">Vælg mit navn</NuxtLink></div>
    <div v-else-if="!state" class="login" role="status"><p>{{ walletError || 'Finder dagens by…' }}</p><button v-if="walletError" class="btn secondary" @click="reload">Prøv igen</button></div>
    <template v-else>
      <div class="aerial" :aria-busy="imageLoading" :style="{ '--photo': image ? 'url(' + image + ')' : 'none' }"><img v-if="image" :src="image" class="photo" alt="Luftfoto af dagens hemmelige by"><div v-if="image && !imageError" class="emil"><img src="/marker.png" alt="Emil er placeret midt i billedet"></div><div v-if="imageLoading || imageError" class="image-status" role="status"><p>{{ imageError || 'Henter luftfoto…' }}</p><button v-if="imageError" class="btn secondary" @click="loadImage">Hent billedet igen</button></div><span class="zoom">{{ ['Helt tæt på', 'Lidt længere væk', 'Byen fra oven', 'Det store overblik', 'Sidste ledetråd'][Math.min(4, city!.guesses.length)] }}</span></div>
      <p class="attribution">Luftfoto © Esri, Maxar, Earthstar Geographics · Navne: GeoNames</p>
      <div v-if="!city!.finished" class="play-status"><p class="question" role="status">{{ busy ? 'Gemmer dit gæt…' : lastWrong ? `Ikke ${lastWrong}. Vi zoomer ud.` : 'Hvilken hovedstad er det?' }}</p><div class="attempts"><div><span v-for="n in 5" :key="n" :class="{ used: n <= city!.guesses.length }" /></div><b>{{ remaining }} gæt tilbage</b></div></div>
      <div v-if="city!.finished" class="result" :class="{ won: city!.won }" role="status"><span class="result-emoji" aria-hidden="true">{{ city!.won ? '🎯' : '🧭' }}</span><div><h2>{{ city!.won ? 'Du fandt Emil!' : 'Emil slap afsted' }}</h2><p>Han var i <b>{{ city!.answer?.name }}</b> · {{ city!.guesses.length }} af 5 gæt.</p><strong>{{ city!.won ? `+${city!.reward} 🍌` : 'En ny chance i morgen' }}</strong><small v-if="city!.won">Eventuelle badgebonusser er også gemt.</small></div></div>
      <div v-else class="options"><button v-for="option in city!.options" :key="option.id" :disabled="busy || imageLoading || !!imageError || !image || city!.guesses.includes(option.id)" :class="{ wrong: city!.guesses.includes(option.id) }" @click="choose(option.id)">{{ option.name }}<span v-if="city!.guesses.includes(option.id)" aria-label="Forkert gæt">×</span></button></div>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
    </template>
    <footer class="game-footer"><DailyResetCountdown v-if="state" compact :at="state.nextResetAt" /><button class="rules-button" @click="rulesDialog?.showModal()">{{ city?.finished ? 'Regler & dine gæt' : 'Regler & præmier' }} ⓘ</button></footer>
    <dialog ref="rulesDialog" class="rules-dialog" aria-labelledby="city-rules-title" @click="($event.target === $event.currentTarget) && rulesDialog?.close()"><div class="rules-body"><button class="close-rules" @click="rulesDialog?.close()" aria-label="Luk">×</button><h2 id="city-rules-title">Find Emil fra oven</h2><p>Find hovedstaden ud fra luftfotoet. Du har fem gæt og seks svarmuligheder. Hvert forkert gæt zoomer billedet ud.</p><p>Rigtigt på 1.–5. gæt giver <b>50 · 40 · 30 · 20 · 10 🍌</b>. En ny opgave venter kl. 04.00 dansk tid.</p><section v-if="city?.finished"><h3>Dine gæt</h3><ol><li v-for="choice in city.guesses" :key="choice">{{ city.options.find(o => o.id === choice)?.name }} {{ choice === city.answer?.id ? '✓' : '×' }}</li></ol><p>Rigtigt svar: <b>{{ city.answer?.name }}</b>.</p></section></div></dialog>
  </div>
</template>
<style scoped>
.city-page { display:flex; flex-direction:column; gap:6px; width:100%; max-width:560px; height:calc(100dvh - var(--nav-space)); min-height:400px; margin:0 auto; padding:calc(6px + var(--safe-t)) 14px 6px; }.top { display:flex; flex:none; align-items:center; gap:8px; min-height:44px; }.top a { display:flex; align-items:center; min-height:44px; color:var(--muted); text-decoration:none; font-size:12px; }.top .game-back { justify-content:center; flex:none; width:38px; font-size:22px; }.top h1 { flex:1; margin:0; font-size:clamp(16px,4.8vw,21px); letter-spacing:-.04em; }.top .balance { flex:none; font-weight:700; }
.aerial { position:relative; flex:1; min-height:0; overflow:hidden; border-radius:20px; background:#151e28; box-shadow:var(--shadow-sm); }.aerial::before { content:' '; position:absolute; inset:0; background-image:var(--photo); background-size:cover; background-position:center; filter:blur(22px); opacity:.35; transform:scale(1.12); }.photo { position:relative; z-index:1; display:block; width:100%; height:100%; object-fit:contain; }.emil { position:absolute; z-index:2; top:50%; left:50%; transform:translate(-50%,-60%); }.emil img { display:block; width:36px; height:45px; object-fit:contain; filter:drop-shadow(0 3px 4px #0008); }.image-status { position:absolute; z-index:4; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; padding:12px; background:var(--glass); text-align:center; font-size:12px; }.image-status p { margin:0; }.zoom { position:absolute; z-index:3; bottom:8px; left:8px; padding:4px 7px; border-radius:7px; background:#101b28cc; color:#fff; font-size:9px; }.attribution { flex:none; margin:0 2px; color:var(--muted); font-size:8px; line-height:1.3; }
.play-status { display:flex; flex:none; align-items:center; justify-content:space-between; gap:10px; min-height:32px; }.question { margin:0; font-size:12px; font-weight:700; line-height:1.35; }.attempts { display:flex; flex:none; flex-direction:column; align-items:flex-end; gap:4px; }.attempts > div { display:flex; gap:3px; }.attempts span { display:block; width:12px; height:4px; border-radius:9px; background:var(--surface-2); }.attempts span.used { background:var(--muted); }.attempts b { font-size:9px; color:var(--muted); }
.options { display:grid; flex:none; grid-template-columns:1fr 1fr; gap:6px; }.options button { display:flex; justify-content:space-between; align-items:center; gap:5px; min-width:0; min-height:44px; padding:8px 10px; border:1px solid var(--hairline); border-radius:12px; background:var(--surface); color:var(--text); font:inherit; font-size:12px; font-weight:700; text-align:left; cursor:pointer; overflow-wrap:anywhere; }.options button:disabled { cursor:default; }.options button:disabled:not(.wrong) { opacity:.6; }.options .wrong { color:var(--muted); background:var(--surface-2); text-decoration:line-through; }
.result { display:flex; flex:none; align-items:center; gap:12px; margin:0; padding:12px; border-radius:18px; background:var(--surface); }.result.won { background:var(--accent-soft); }.result-emoji { flex:none; font-size:32px; }.result > div { min-width:0; }.result h2 { margin:0; font-size:17px; line-height:1.2; }.result p { margin:4px 0; color:var(--muted); font-size:11px; }.result strong { display:block; font-size:25px; line-height:1.1; }.result small { display:block; margin-top:3px; color:var(--muted); font-size:9px; }
.game-footer { display:flex; flex:none; justify-content:space-between; align-items:center; gap:8px; min-height:40px; }.rules-button { min-height:44px; margin-left:auto; padding:4px 0 4px 10px; border:0; background:none; color:var(--muted); font:inherit; font-size:11px; cursor:pointer; }.login { flex:1; color:var(--muted); font-size:14px; }.error { flex:none; margin:0; color:var(--muted); font-size:11px; }
.rules-dialog { position:fixed; inset:0; width:min(420px,calc(100% - 28px)); max-height:80dvh; margin:auto; padding:0; border:1px solid var(--hairline); border-radius:22px; background:var(--bg); color:var(--text); box-shadow:var(--shadow); overflow:auto; }.rules-dialog::backdrop { background:#100d1f99; backdrop-filter:blur(4px); }.rules-body { position:relative; padding:22px 18px; }.rules-body h2 { padding-right:35px; font-size:21px; }.rules-body p,.rules-body li { font-size:13px; color:var(--muted); line-height:1.7; }.rules-body h3 { margin-top:20px; font-size:15px; }.close-rules { position:absolute; top:9px; right:9px; width:44px; height:44px; border:0; border-radius:50%; background:var(--surface-2); color:var(--text); font-size:25px; cursor:pointer; }button:focus-visible,a:focus-visible { outline:3px solid var(--text); outline-offset:3px; }
@media(max-height:650px) { .city-page { gap:4px; padding-top:3px; padding-bottom:3px; }.top h1 { font-size:16px; }.options button { padding:6px 9px; font-size:11px; }.play-status { min-height:28px; }.result { padding:10px; }.result h2 { font-size:15px; } }
</style>