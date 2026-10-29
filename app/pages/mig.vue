<script setup lang="ts">
// "Hvem er du?": vælg et navn (låses til enheden), brug en kode fra en anden
// enhed, eller – når man er logget ind – lav en kode til en ny enhed.
const { name, ready, claim, pair, createCode, logout, setAvatar, removeAvatar } = useUser()
const { people } = useStickers()
const { isTaken: taken, avatarFor, reload: reloadUsers } = useUsers()

useHead({ title: 'Mig · Stenbygaard Stickers' })

const mode = ref<'name' | 'code'>('name')
const input = ref('')
const codeInput = ref('')
const error = ref('')
const busy = ref(false)

onMounted(reloadUsers)

const free = computed(() => people.value.map(p => p.name).filter(n => !taken(n)))
const isTaken = computed(() => Boolean(input.value.trim() && taken(input.value.trim())))

// Profilbillede
const fileInput = ref<HTMLInputElement>()
const uploading = ref(false)
const hasAvatar = computed(() => Boolean(name.value && avatarFor(name.value)))

async function onFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  ;(e.target as HTMLInputElement).value = ''
  if (!file) return
  uploading.value = true
  await run(() => setAvatar(file))
  uploading.value = false
}

async function run(fn: () => Promise<unknown>) {
  busy.value = true
  error.value = ''
  try {
    await fn()
  }
  catch (err: any) {
    error.value = err?.data?.statusMessage || 'Noget gik galt – prøv igen'
  }
  finally {
    busy.value = false
  }
}

function submitName() {
  return run(async () => {
    await claim(input.value)
    input.value = ''
  })
}

function submitCode() {
  return run(async () => {
    await pair(codeInput.value)
    codeInput.value = ''
  })
}

// Kode til en ny enhed, med nedtælling
const code = ref<PairCode>()
const now = ref(Date.now())
let timer: ReturnType<typeof setInterval> | undefined
const secondsLeft = computed(() => (code.value ? Math.max(0, Math.round((Date.parse(code.value.expiresAt) - now.value) / 1000)) : 0))
const countdown = computed(() => `${Math.floor(secondsLeft.value / 60)}:${String(secondsLeft.value % 60).padStart(2, '0')}`)

function newCode() {
  return run(async () => {
    code.value = await createCode()
    now.value = Date.now()
    clearInterval(timer)
    timer = setInterval(() => {
      now.value = Date.now()
      if (!secondsLeft.value) {
        clearInterval(timer)
        code.value = undefined
      }
    }, 1000)
  })
}
onBeforeUnmount(() => clearInterval(timer))

const router = useRouter()
function toProfile() {
  if (window.history.state?.back && name.value && window.history.state.back === personUrl(name.value)) router.back()
  else if (name.value) router.push(personUrl(name.value))
}

// Lige logget ind: videre til profilen
watch(name, (n, old) => {
  if (n && !old && ready.value) router.push(personUrl(n))
})

const confirmLogout = ref(false)
function doLogout() {
  return run(async () => {
    await logout()
    confirmLogout.value = false
    code.value = undefined
  })
}
</script>

<template>
  <div class="page">
    <p v-if="!ready" class="empty">Henter…</p>

    <!-- Logget ind -->
    <template v-else-if="name">
      <button class="back" aria-label="Tilbage til profilen" @click="toProfile">
        <svg viewBox="0 0 24 24"><path d="M15 5 8 12l7 7" /></svg>
      </button>
      <header>
        <button class="avatar-btn" :aria-label="hasAvatar ? 'Skift profilbillede' : 'Vælg profilbillede'" :disabled="uploading" @click="fileInput?.click()">
          <UserAvatar class="avatar" :class="{ dim: uploading }" :name="name" />
          <span class="cam">
            <svg viewBox="0 0 24 24"><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>
          </span>
        </button>
        <input ref="fileInput" type="file" accept="image/*" hidden @change="onFile">
        <div class="pic-actions">
          <button class="link" :disabled="uploading" @click="fileInput?.click()">
            {{ uploading ? 'Uploader…' : hasAvatar ? 'Skift billede' : 'Tilføj profilbillede' }}
          </button>
          <button v-if="hasAvatar && !uploading" class="link muted" @click="run(removeAvatar)">Fjern</button>
        </div>
        <p class="eyebrow">Du er logget ind som</p>
        <h1>{{ name }}</h1>
      </header>

      <NuxtLink class="card link-row" to="/notifikationer">
        <span class="icon">🔔</span>
        <div>
          <h2>Notifikationer</h2>
          <p class="hint">Badges, level, tags, kommentarer og nye stickers</p>
        </div>
        <svg viewBox="0 0 24 24"><path d="m9 5 7 7-7 7" /></svg>
      </NuxtLink>

      <AppearanceSettings />

      <section class="card">
        <h2>Brug appen på en enhed mere</h2>
        <p class="hint">Fx en ny telefon, din computer eller appen på hjemmeskærmen. Tryk på knappen og skriv koden på den anden enhed under »Jeg har en kode«.</p>
        <div v-if="code" class="code">
          <span class="digits">{{ code.code.slice(0, 3) }} {{ code.code.slice(3) }}</span>
          <span class="hint">Gælder i {{ countdown }}</span>
        </div>
        <button v-else class="btn secondary" :disabled="busy" @click="newCode">Vis kode</button>
      </section>

      <section class="card">
        <h2>Log ud</h2>
        <p class="hint">Logger kun denne enhed ud. Din profil og dit navn bliver bevaret. For at logge ind igen skal du bruge en kode fra en anden enhed eller få hjælp af admin.</p>
        <button v-if="!confirmLogout" class="btn secondary" @click="confirmLogout = true">Log ud</button>
        <div v-else class="row">
          <button class="btn danger" :disabled="busy" @click="doLogout">Ja, log ud</button>
          <button class="btn secondary" @click="confirmLogout = false">Fortryd</button>
        </div>
      </section>

      <p v-if="error" class="err">{{ error }}</p>
    </template>

    <!-- Ikke logget ind -->
    <template v-else>
      <header>
        <img class="logo" src="/marker.png" alt="">
        <h1>Hvem er du?</h1>
        <p class="sub">Vælg dit navn, så kan appen kende dig. Det er helt frivilligt – og der er ingen adgangskode.</p>
      </header>

      <div class="tabs" role="tablist">
        <button :class="{ on: mode === 'name' }" @click="mode = 'name'; error = ''">Vælg navn</button>
        <button :class="{ on: mode === 'code' }" @click="mode = 'code'; error = ''">Jeg har en kode</button>
      </div>

      <AppearanceSettings />

      <form v-if="mode === 'name'" class="form" @submit.prevent="submitName">
        <div v-if="free.length" class="field">
          <span class="eyebrow">Er du en af dem?</span>
          <div class="chips">
            <button
              v-for="n in free"
              :key="n"
              type="button"
              class="chip person"
              :class="{ on: sameName(n, input) }"
              @click="input = n"
            >
              <UserAvatar class="mini" :name="n" />{{ n }}
            </button>
          </div>
        </div>
        <label class="field">
          <span class="eyebrow">{{ free.length ? 'Eller skriv dit navn' : 'Dit navn' }}</span>
          <input v-model="input" maxlength="30" autocomplete="given-name" autocapitalize="words" placeholder="Fx Mathias" :class="{ invalid: isTaken }">
        </label>
        <p v-if="isTaken" class="err">{{ input.trim() }} er allerede taget. Er det dig, så brug en kode fra din anden enhed.</p>
        <p v-else-if="error" class="err">{{ error }}</p>
        <button class="btn" :disabled="!input.trim() || isTaken || busy">{{ busy ? 'Gemmer…' : 'Det er mig' }}</button>
      </form>

      <form v-else class="form" @submit.prevent="submitCode">
        <p class="hint">Åbn appen på den enhed, hvor du allerede er logget ind, gå til »Mig« og tryk »Vis kode«.</p>
        <label class="field">
          <span class="eyebrow">Kode</span>
          <input v-model="codeInput" class="code-input" inputmode="numeric" autocomplete="one-time-code" maxlength="7" placeholder="123 456">
        </label>
        <p v-if="error" class="err">{{ error }}</p>
        <button class="btn" :disabled="codeInput.replace(/\D/g, '').length !== 6 || busy">{{ busy ? 'Tjekker…' : 'Log ind' }}</button>
      </form>
    </template>
  </div>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 480px;
  margin: 0 auto;
  padding: calc(28px + var(--safe-t)) 16px var(--nav-space);
}
.back {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  margin: -12px 0 -32px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: var(--surface);
  box-shadow: var(--shadow-sm);
  cursor: pointer;
}
.back svg { width: 22px; height: 22px; fill: none; stroke: currentColor; stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; }
header {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  margin-bottom: 4px;
}
.avatar-btn {
  position: relative;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: none;
  cursor: pointer;
}
.cam {
  position: absolute;
  right: -2px;
  bottom: -2px;
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border: 3px solid var(--bg);
  border-radius: 50%;
  background: var(--ink);
  color: #fff;
}
.cam svg { width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linejoin: round; }
.dim { opacity: .5; }
.pic-actions {
  display: flex;
  gap: 14px;
  margin: 10px 0 14px;
}
.link {
  padding: 0;
  border: 0;
  background: none;
  font-size: 14px;
  font-weight: 700;
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
}
.link.muted { color: var(--muted); }
.avatar {
  display: grid;
  place-items: center;
  width: 96px;
  height: 96px;
  border-radius: 50%;
  background: linear-gradient(160deg, var(--accent-light), var(--accent));
  color: var(--on-accent);
  font-size: 36px;
  font-weight: 800;
  box-shadow: 0 12px 30px rgba(0, 0, 0, .15);
}
.logo {
  width: 96px;
  height: 96px;
  object-fit: contain;
  filter: drop-shadow(0 6px 10px rgba(0, 0, 0, .25));
}
h1 { font-size: 30px; }
header .eyebrow { margin: 0 0 2px; }
.sub {
  margin: 6px 0 0;
  color: var(--muted);
}
.card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 18px;
  border-radius: var(--radius);
  background: var(--surface);
  box-shadow: var(--shadow-sm);
}
.card h2 { font-size: 18px; }
.link-row {
  flex-direction: row;
  align-items: center;
  gap: 14px;
  text-decoration: none;
}
.link-row > div { flex: 1; }
.link-row .hint { margin-top: 2px; }
.link-row .icon { font-size: 24px; }
.link-row svg { flex: none; width: 20px; height: 20px; fill: none; stroke: var(--muted); stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; }
.hint {
  margin: 0;
  font-size: 14px;
  color: var(--muted);
}
.code {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 14px;
  border-radius: 16px;
  background: var(--accent-soft);
}
.digits {
  font-size: 38px;
  font-weight: 800;
  letter-spacing: .08em;
  font-variant-numeric: tabular-nums;
}
.row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.tabs {
  display: flex;
  gap: 4px;
  padding: 4px;
  border-radius: 14px;
  background: var(--surface-2);
}
.tabs button {
  flex: 1;
  padding: 8px 6px;
  border: 0;
  border-radius: 10px;
  background: none;
  font-size: 14px;
  font-weight: 700;
  color: var(--muted);
  cursor: pointer;
}
.tabs button.on {
  background: var(--surface);
  color: var(--text);
  box-shadow: var(--shadow-sm);
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.person {
  padding: 4px 12px 4px 4px;
  background: var(--surface);
  box-shadow: var(--shadow-sm);
  font-size: 14px;
}
.person.on { background: var(--ink); color: #fff; }
.mini {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--accent);
  color: var(--on-accent);
  font-size: 12px;
  font-weight: 800;
}
.code-input {
  font-size: 24px !important;
  font-weight: 700;
  letter-spacing: .15em;
  text-align: center;
}
.err { margin: 0; color: #c62828; font-weight: 600; }
.empty { color: var(--muted); text-align: center; }
</style>
