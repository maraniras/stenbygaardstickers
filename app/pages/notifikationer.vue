<script setup lang="ts">
// Notifikationer: hovedkontakt for denne enhed og en kontakt pr. type (gemt på
// brugeren, så de gælder alle ens enheder). Uden navn kan man kun få nye stickers.
const router = useRouter()
const { name, ready, badgePush, notify, setBadgePush, setNotify } = useUser()
const all = usePush('all')

useHead({ title: 'Notifikationer · Stenbygaard Stickers' })

const supported = ref(true)
const homeScreenFirst = ref(false)
const blocked = ref(false)
const busy = ref(false)
const error = ref('')

onMounted(async () => {
  supported.value = pushSupported()
  homeScreenFirst.value = needsHomeScreen()
  blocked.value = supported.value && Notification.permission === 'denied'
  await all.refresh()
})

/** Får denne enhed overhovedet notifikationer */
const deviceOn = computed(() => all.on.value || (Boolean(name.value) && badgePush.value))
const types = computed(() =>
  name.value ? NOTIFY_TYPES : NOTIFY_TYPES.filter((t) => t.type === 'stickers'),
)

async function run(fn: () => Promise<unknown>) {
  busy.value = true
  error.value = ''
  try {
    await fn()
  } catch (err: any) {
    if (supported.value && Notification.permission === 'denied') blocked.value = true
    else error.value = err?.data?.statusMessage || err?.message || 'Det lykkedes ikke'
  } finally {
    busy.value = false
  }
}

function toggleDevice() {
  return run(async () => {
    if (deviceOn.value) {
      await all.disable()
      if (name.value) await setBadgePush(false)
    } else {
      await all.enable()
      if (name.value) await setBadgePush(true)
    }
  })
}

function toggleType(type: NotifyType) {
  return run(() => setNotify(type, !wants(notify.value, type)))
}

function back() {
  if (window.history.state?.back) router.back()
  else router.push('/liste')
}
</script>

<template>
  <div class="page">
    <button
      class="back"
      aria-label="Tilbage"
      @click="back"
    >
      <svg viewBox="0 0 24 24"><path d="M15 5 8 12l7 7" /></svg>
    </button>

    <header>
      <h1>Notifikationer</h1>
      <p class="sub">Vælg hvad du vil have besked om.</p>
    </header>

    <p
      v-if="!ready"
      class="hint"
    >
      Henter…
    </p>

    <template v-else>
      <div
        v-if="homeScreenFirst"
        class="note"
      >
        <span>📲</span>
        <p>
          På iPhone kan der kun komme besked fra appen på hjemmeskærmen: tryk på Del <b>⬆︎</b> i
          Safari, vælg »Føj til hjemmeskærm«, og åbn appen derfra.
        </p>
      </div>
      <div
        v-else-if="!supported"
        class="note"
      >
        <span>🔕</span>
        <p>
          Denne browser kan ikke vise notifikationer. Prøv Chrome, eller føj appen til
          hjemmeskærmen.
        </p>
      </div>
      <div
        v-else-if="blocked"
        class="note"
      >
        <span>🔕</span>
        <p>
          Notifikationer er blokeret. Slå dem til for appen (eller browseren) i telefonens
          indstillinger, og kom tilbage hertil.
        </p>
      </div>

      <section class="card main">
        <div class="row">
          <div class="text">
            <b>Notifikationer på denne enhed</b>
            <span>{{ deviceOn ? 'Slået til' : 'Slået fra' }}</span>
          </div>
          <button
            class="switch"
            :class="{ on: deviceOn }"
            role="switch"
            :aria-checked="deviceOn"
            :disabled="busy || !supported || homeScreenFirst"
            @click="toggleDevice"
          >
            <span />
          </button>
        </div>
      </section>

      <section
        class="card types"
        :class="{ dim: !deviceOn }"
      >
        <h2 class="eyebrow">Hvad vil du have besked om?</h2>
        <div
          v-for="t in types"
          :key="t.type"
          class="row"
        >
          <span class="emoji">{{ t.emoji }}</span>
          <div class="text">
            <b>{{ t.label }}</b>
            <span>{{ t.desc }}</span>
          </div>
          <button
            v-if="name"
            class="switch"
            :class="{ on: wants(notify, t.type) }"
            role="switch"
            :aria-checked="wants(notify, t.type)"
            :aria-label="t.label"
            :disabled="busy"
            @click="toggleType(t.type)"
          >
            <span />
          </button>
        </div>
        <p
          v-if="!deviceOn"
          class="hint"
        >
          Slå notifikationer til på denne enhed for at få dem.
        </p>
        <p
          v-else-if="name"
          class="hint"
        >
          Valgene gælder alle dine enheder.
        </p>
      </section>

      <NuxtLink
        v-if="!name"
        class="card login"
        to="/mig"
      >
        <span>🏅</span>
        <p>
          <b>Vil du have besked om badges, tags og kommentarer?</b><br />Vælg dit navn under »Mig«.
        </p>
      </NuxtLink>

      <p
        v-if="error"
        class="err"
      >
        {{ error }}
      </p>
    </template>
  </div>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-width: 480px;
  margin: 0 auto;
  padding: calc(20px + var(--safe-t)) 16px var(--nav-space);
}
.back {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: var(--surface);
  box-shadow: var(--shadow-sm);
  cursor: pointer;
}
.back svg {
  width: 22px;
  height: 22px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.4;
  stroke-linecap: round;
  stroke-linejoin: round;
}
h1 {
  font-size: 30px;
}
.sub {
  margin: 4px 0 0;
  color: var(--muted);
}
.card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 14px 16px;
  border-radius: var(--radius);
  background: var(--surface);
  box-shadow: var(--shadow-sm);
}
.types h2 {
  margin: 2px 0 6px;
}
.types.dim .row {
  opacity: 0.5;
}
.row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
}
.types .row + .row {
  border-top: 1px solid var(--hairline);
}
.emoji {
  font-size: 22px;
  width: 28px;
  text-align: center;
}
.text {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.text b {
  font-size: 15px;
}
.text span {
  font-size: 13px;
  color: var(--muted);
}
.switch {
  flex: none;
  position: relative;
  width: 52px;
  height: 32px;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: var(--surface-2);
  cursor: pointer;
  transition: background 0.2s;
}
.switch:disabled {
  opacity: 0.5;
  cursor: default;
}
.switch span {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
  transition: transform 0.2s;
}
.switch.on {
  background: var(--ink);
}
.switch.on span {
  transform: translateX(20px);
}
.hint {
  margin: 6px 0 2px;
  font-size: 13px;
  color: var(--muted);
}
.note {
  display: flex;
  gap: 12px;
  padding: 14px 16px;
  border-radius: var(--radius);
  background: var(--accent-soft);
}
.note span {
  font-size: 24px;
}
.note p {
  margin: 0;
  font-size: 14px;
}
.login {
  flex-direction: row;
  align-items: center;
  gap: 12px;
  text-decoration: none;
}
.login span {
  font-size: 26px;
}
.login p {
  margin: 0;
  font-size: 14px;
}
.err {
  margin: 0;
  color: #c62828;
  font-weight: 600;
}
</style>
