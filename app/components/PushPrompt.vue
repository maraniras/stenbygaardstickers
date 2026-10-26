<script setup lang="ts">
// Lille boks nederst, der spørger om besked om nye stickers. Vises af sig selv én gang
// (første åbning efter opdateringen) og ellers når man trykker på klokken på listen.
// Browseren tillader kun at spørge om lov efter et tryk, derfor vores egen boks først.
export type PromptMode = 'ask' | 'ios' | 'blocked' | 'unsupported' | 'on' | 'off'

const ASKED = 'stenbygaard-push-asked'
const mode = useState<PromptMode | null>('push-prompt', () => null)
const { on, busy, refresh, enable } = usePush('all')
const { open: installOpen } = useInstall()
const namePrompt = useState<'pending' | 'open' | 'done'>('name-prompt', () => 'pending')
const error = ref('')

function pushAsked() {
  try { return Boolean(localStorage.getItem(ASKED)) }
  catch { return true }
}

onMounted(async () => {
  await refresh()
  let asked = false
  try { asked = Boolean(localStorage.getItem(ASKED)) }
  catch {}
  if (asked || on.value || !pushSupported() || Notification.permission === 'denied') return
  // Vis ikke oven i install-boksen – vent til den er lukket. Spørger "Hvem er du?"
  // (NamePrompt.vue), spørger den selv om notifikationer bagefter.
  const tryAsk = () => { if (!mode.value && !installOpen.value && namePrompt.value === 'done' && !pushAsked()) mode.value = 'ask' }
  setTimeout(() => {
    if (!installOpen.value) return void setTimeout(tryAsk, 600)
    const stop = watch(installOpen, (open) => {
      if (open) return
      stop()
      setTimeout(tryAsk, 600)
    })
  }, 2500)
})

function close() {
  mode.value = null
  error.value = ''
  try { localStorage.setItem(ASKED, new Date().toISOString()) }
  catch {}
}

async function yes() {
  error.value = ''
  try {
    await enable()
    mode.value = 'on'
    try { localStorage.setItem(ASKED, new Date().toISOString()) }
    catch {}
    setTimeout(() => { if (mode.value === 'on') mode.value = null }, 2500)
  }
  catch (err: any) {
    if (Notification.permission === 'denied') mode.value = 'blocked'
    else error.value = err?.message || 'Det lykkedes ikke'
  }
}

watch(mode, (m) => {
  if (m === 'off') setTimeout(() => { if (mode.value === 'off') mode.value = null }, 2500)
})
</script>

<template>
  <Transition name="pop">
    <div v-if="mode" class="prompt glass" role="dialog" aria-live="polite">
      <template v-if="mode === 'ask'">
        <div class="head">
          <span class="icon">🔔</span>
          <div>
            <b>Vil du have besked, når Emil lander et nyt sted?</b>
            <p>Du får en notifikation, hver gang en ny sticker kommer på kortet.</p>
          </div>
        </div>
        <p v-if="error" class="err">{{ error }}</p>
        <div class="actions">
          <button class="btn secondary" :disabled="busy" @click="close">Nej tak</button>
          <button class="btn" :disabled="busy" @click="yes">{{ busy ? 'Vent…' : 'Ja tak' }}</button>
        </div>
      </template>

      <template v-else-if="mode === 'ios'">
        <div class="head">
          <span class="icon">📲</span>
          <div>
            <b>Føj appen til hjemmeskærmen først</b>
            <p>På iPhone kan der kun komme besked fra appen på hjemmeskærmen: tryk på Del <span class="share">⬆︎</span> i Safari, vælg »Føj til hjemmeskærm«, og åbn appen derfra.</p>
          </div>
        </div>
        <div class="actions"><button class="btn" @click="close">OK</button></div>
      </template>

      <template v-else-if="mode === 'blocked' || mode === 'unsupported'">
        <div class="head">
          <span class="icon">🔕</span>
          <div>
            <b>{{ mode === 'blocked' ? 'Notifikationer er slået fra' : 'Ikke muligt i denne browser' }}</b>
            <p v-if="mode === 'blocked'">Slå notifikationer til for appen (eller browseren) i telefonens indstillinger, og prøv igen.</p>
            <p v-else>Prøv at åbne appen i Chrome, eller føj den til hjemmeskærmen.</p>
          </div>
        </div>
        <div class="actions"><button class="btn" @click="close">OK</button></div>
      </template>

      <div v-else class="head done">
        <span class="icon">{{ mode === 'on' ? '🎉' : '🔕' }}</span>
        <b>{{ mode === 'on' ? 'Du får besked om nye stickers' : 'Besked om nye stickers er slået fra' }}</b>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.prompt {
  position: fixed;
  left: 12px;
  right: 12px;
  bottom: var(--nav-space);
  z-index: 1100;
  max-width: 480px;
  margin: 0 auto;
  padding: 16px;
  border-radius: var(--radius);
}
.head { display: flex; gap: 12px; align-items: flex-start; }
.head.done { align-items: center; }
.icon { font-size: 28px; line-height: 1.1; }
.head b { display: block; font-size: 16px; line-height: 1.3; }
.head p { margin: 4px 0 0; font-size: 14px; color: var(--muted); }
.share { font-weight: 800; }
.actions {
  display: flex;
  gap: 8px;
  margin-top: 14px;
}
.actions .btn { flex: 1; min-height: 44px; font-size: 15px; }
.err { margin: 10px 0 0; color: #c62828; font-size: 13px; font-weight: 600; }
.pop-enter-active, .pop-leave-active { transition: transform .3s cubic-bezier(.2, .9, .3, 1), opacity .25s; }
.pop-enter-from, .pop-leave-to { transform: translateY(30px); opacity: 0; }
</style>
