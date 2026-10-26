<script setup lang="ts">
// "Hvem er du?": vælg et navn (låses til enheden), brug en kode fra en anden
// enhed, eller – når man er logget ind – lav en kode til en ny enhed.
const { name, ready, claim, pair, createCode, logout } = useUser()
const { people } = useStickers()

useHead({ title: 'Mig · Stenbygaard Stickers' })

const mode = ref<'name' | 'code'>('name')
const input = ref('')
const codeInput = ref('')
const error = ref('')
const busy = ref(false)
const taken = ref<string[]>([])

onMounted(async () => {
  taken.value = await $fetch<string[]>('/api/users').catch(() => [])
})

const free = computed(() => people.value.map(p => p.name).filter(n => !taken.value.some(t => sameName(t, n))))
const isTaken = computed(() => Boolean(input.value.trim() && taken.value.some(t => sameName(t, input.value.trim()))))

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
      <header>
        <span class="avatar">{{ name[0] }}</span>
        <p class="eyebrow">Du er logget ind som</p>
        <h1>{{ name }}</h1>
      </header>

      <NuxtLink class="btn" :to="personUrl(name)">Se min profil</NuxtLink>

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
        <p class="hint">Logger kun denne enhed ud. Er det din eneste enhed, bliver navnet ledigt igen, så andre kan vælge det.</p>
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
              <span class="mini">{{ n[0] }}</span>{{ n }}
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
header {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  margin-bottom: 4px;
}
.avatar {
  display: grid;
  place-items: center;
  width: 84px;
  height: 84px;
  margin-bottom: 14px;
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
