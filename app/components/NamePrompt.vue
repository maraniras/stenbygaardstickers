<script setup lang="ts">
// "Hvem er du?" – vises én gang (efter install-boksen) for dem der ikke har valgt et
// navn. Bagefter spørges om notifikationer, så man får tags og badges med det samme.
// Imens venter PushPrompt.vue (state "name-prompt" skal være "done").
type Step = 'name' | 'push' | 'welcome'

const ASKED = 'stenbygaard-name-asked'
const state = useState<'pending' | 'open' | 'done'>('name-prompt', () => 'pending')
const step = ref<Step>('name')
const { name, ready, claim, setBadgePush } = useUser()
const { people } = useStickers()
const { isTaken } = useUsers()
const { open: installOpen } = useInstall()
const all = usePush('all')
const route = useRoute()

const input = ref('')
const busy = ref(false)
const error = ref('')
// Login i selve boksen skal stadig kunne fortsætte til notifikationsspørgsmålet.
const claimingHere = ref(false)
let openTimer: ReturnType<typeof setTimeout> | undefined

const free = computed(() => people.value.map(p => p.name).filter(n => !isTaken(n)).slice(0, 8))
const taken = computed(() => Boolean(input.value.trim() && isTaken(input.value.trim())))

function asked() {
  try { return Boolean(localStorage.getItem(ASKED)) }
  catch { return true }
}
function remember() {
  try { localStorage.setItem(ASKED, new Date().toISOString()) }
  catch {}
}

const busyRoute = computed(() => ['/mig', '/upload', '/notifikationer'].includes(route.path) || route.path.startsWith('/admin'))

function cancelOpen() {
  clearTimeout(openTimer)
  openTimer = undefined
}

function tryOpen() {
  openTimer = undefined
  if (state.value !== 'pending') return
  // Man kan have valgt sit navn på »Mig«, mens boksen ventede.
  if (name.value || asked()) return close()
  if (installOpen.value || busyRoute.value) {
    openTimer = setTimeout(tryOpen, 2000)
    return
  }
  state.value = 'open'
}

watch([ready, name], ([r, n]) => {
  if (!r) return
  if (n) {
    remember()
    cancelOpen()
    if (!claimingHere.value) state.value = 'done'
    return
  }
  if (asked()) return close()
  if (state.value === 'pending' && !openTimer) openTimer = setTimeout(tryOpen, 2500)
}, { immediate: true })

onBeforeUnmount(cancelOpen)

function close() {
  cancelOpen()
  remember()
  state.value = 'done'
}

async function submit() {
  if (busy.value) return
  if (name.value) return close()
  claimingHere.value = true
  busy.value = true
  error.value = ''
  try {
    await claim(input.value)
    remember()
    const canPush = pushSupported() && !needsHomeScreen() && Notification.permission !== 'denied'
    if (canPush) {
      await all.refresh()
      step.value = all.on.value ? 'welcome' : 'push'
    }
    else {
      step.value = 'welcome'
    }
    if (step.value === 'welcome') setTimeout(close, 2500)
  }
  catch (err: any) {
    error.value = err?.data?.statusMessage || 'Det lykkedes ikke – prøv igen'
  }
  finally {
    claimingHere.value = false
    busy.value = false
  }
}

async function enablePush() {
  busy.value = true
  error.value = ''
  try {
    await all.enable()
    await setBadgePush(true)
    try { localStorage.setItem('stenbygaard-push-asked', new Date().toISOString()) }
    catch {}
    step.value = 'welcome'
    setTimeout(close, 2500)
  }
  catch (err: any) {
    error.value = err?.message || 'Notifikationer kunne ikke slås til'
  }
  finally {
    busy.value = false
  }
}

function skipPush() {
  try { localStorage.setItem('stenbygaard-push-asked', new Date().toISOString()) }
  catch {}
  close()
}
</script>

<template>
  <Transition name="pop">
    <div v-if="state === 'open' && !busyRoute && (step !== 'name' || !name)" class="prompt glass" role="dialog" aria-labelledby="name-prompt-title">
      <template v-if="step === 'name'">
        <div class="head">
          <span class="icon">👋</span>
          <div>
            <b id="name-prompt-title">Hvem er du?</b>
            <p>Vælg dit navn for at kunne kommentere, blive tagget og få badges. Ingen adgangskode.</p>
          </div>
        </div>
        <div v-if="free.length" class="chips">
          <button v-for="n in free" :key="n" type="button" class="chip person" :class="{ on: sameName(n, input) }" @click="input = n">
            <UserAvatar class="mini" :name="n" />{{ n }}
          </button>
        </div>
        <form class="row" @submit.prevent="submit">
          <input v-model="input" maxlength="30" autocomplete="given-name" autocapitalize="words" placeholder="Dit navn" :class="{ invalid: taken }">
          <button class="btn" :disabled="!input.trim() || taken || busy">{{ busy ? '…' : 'Det er mig' }}</button>
        </form>
        <p v-if="taken" class="err">{{ input.trim() }} er taget. Er det dig, så brug en kode fra din anden enhed under »Mig«.</p>
        <p v-else-if="error" class="err">{{ error }}</p>
        <button class="later" @click="close">Ikke nu</button>
      </template>

      <template v-else-if="step === 'push'">
        <div class="head">
          <span class="icon">🔔</span>
          <div>
            <b>Hej {{ name }}! Vil du have besked?</b>
            <p>Når nogen tagger dig, svarer dig, du får en badge – eller Emil lander et nyt sted. Du kan altid vælge typer under Notifikationer.</p>
          </div>
        </div>
        <p v-if="error" class="err">{{ error }}</p>
        <div class="actions">
          <button class="btn secondary" :disabled="busy" @click="skipPush">Nej tak</button>
          <button class="btn" :disabled="busy" @click="enablePush">{{ busy ? 'Vent…' : 'Ja tak' }}</button>
        </div>
      </template>

      <div v-else class="head done">
        <span class="icon">🎉</span>
        <b>Velkommen, {{ name }}!</b>
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
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 12px;
}
.person {
  padding: 3px 10px 3px 3px;
  background: var(--surface);
  box-shadow: var(--shadow-sm);
  font-size: 14px;
}
.person.on { background: var(--ink); color: #fff; }
.mini {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--accent);
  color: var(--on-accent);
  font-size: 12px;
  font-weight: 800;
}
.row {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}
.row input {
  flex: 1;
  min-width: 0;
  height: 44px;
  padding: 0 14px;
  border: 1px solid var(--hairline);
  border-radius: 14px;
  background: var(--surface);
  font-size: 16px;
  outline: none;
}
.row input:focus { border-color: var(--text); }
.row input.invalid { border-color: #c62828; }
.row .btn { min-height: 44px; padding: 0 16px; font-size: 15px; }
.actions {
  display: flex;
  gap: 8px;
  margin-top: 14px;
}
.actions .btn { flex: 1; min-height: 44px; font-size: 15px; }
.later {
  display: block;
  margin: 10px auto 0;
  padding: 0;
  border: 0;
  background: none;
  font-size: 13px;
  font-weight: 700;
  color: var(--muted);
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
}
.err { margin: 8px 0 0; color: #c62828; font-size: 13px; font-weight: 600; }
.pop-enter-active, .pop-leave-active { transition: transform .3s cubic-bezier(.2, .9, .3, 1), opacity .25s; }
.pop-enter-from, .pop-leave-to { transform: translateY(30px); opacity: 0; }
</style>
