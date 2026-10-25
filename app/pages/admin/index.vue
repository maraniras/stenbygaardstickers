<script setup lang="ts">
const { admin, all, check, login, logout, load } = useAdmin()
const tab = ref<'pending' | 'approved'>('pending')
const password = ref('')
const error = ref('')
const loggingIn = ref(false)

useHead({ title: 'Admin · Stenbygaard Stickers' })

const pending = computed(() => (all.value ?? []).filter(s => s.status === 'pending')
  .sort((a, b) => (b.submittedAt ?? '').localeCompare(a.submittedAt ?? '')))
const approved = computed(() => (all.value ?? []).filter(s => s.status === 'approved'))
const shown = computed(() => (tab.value === 'pending' ? pending.value : approved.value))

onMounted(async () => {
  if (await check()) await load()
})

async function submit() {
  loggingIn.value = true
  error.value = ''
  try {
    await login(password.value)
    password.value = ''
    await load()
  }
  catch (err: any) {
    error.value = err?.data?.statusMessage || 'Kunne ikke logge ind'
  }
  finally {
    loggingIn.value = false
  }
}

function submitted(s: StoredSticker) {
  if (!s.submittedAt) return ''
  return new Date(s.submittedAt).toLocaleString('da-DK', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <div class="page">
    <header>
      <h1>Admin</h1>
      <button v-if="admin" class="chip" @click="logout">Log ud</button>
    </header>

    <form v-if="admin === false" class="form login" @submit.prevent="submit">
      <label class="field">
        <span class="eyebrow">Adgangskode</span>
        <input v-model="password" type="password" autocomplete="current-password">
      </label>
      <p v-if="error" class="err">{{ error }}</p>
      <button class="btn" :disabled="!password || loggingIn">{{ loggingIn ? 'Logger ind…' : 'Log ind' }}</button>
    </form>

    <template v-else-if="admin && all">
      <div class="sort" role="tablist">
        <button :class="{ on: tab === 'pending' }" @click="tab = 'pending'">
          Venter <span v-if="pending.length" class="n">{{ pending.length }}</span>
        </button>
        <button :class="{ on: tab === 'approved' }" @click="tab = 'approved'">Godkendte</button>
      </div>

      <p v-if="!shown.length" class="empty">
        {{ tab === 'pending' ? 'Ingen stickers venter på godkendelse.' : 'Ingen godkendte stickers.' }}
      </p>

      <div class="rows">
        <NuxtLink v-for="s in shown" :key="s.id" class="row" :to="`/admin/${s.id}`">
          <img v-if="thumbnail(s)" :src="thumbnail(s)" alt="">
          <img v-else src="/marker.png" alt="" class="fallback">
          <div class="info">
            <b>{{ s.title }}</b>
            <span><CountryFlag v-if="s.countryCode" :code="s.countryCode" /> {{ s.city || 'Ukendt sted' }} · {{ formatDate(s.date) }}</span>
            <span>{{ formatNames(s.placedBy) || 'Ingen navne' }} · {{ s.media.length }} {{ s.media.length === 1 ? 'medie' : 'medier' }}</span>
            <span v-if="s.status === 'pending' && s.submittedAt" class="when">Indsendt {{ submitted(s) }}</span>
          </div>
          <svg viewBox="0 0 24 24"><path d="m9 5 7 7-7 7" /></svg>
        </NuxtLink>
      </div>
    </template>

    <p v-else class="empty">Henter…</p>
  </div>
</template>

<style scoped>
.page {
  max-width: 640px;
  margin: 0 auto;
  padding: calc(20px + var(--safe-t)) 16px var(--nav-space);
}
header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
}
h1 { font-size: 34px; }
.login { max-width: 360px; }
.err { margin: 0; color: #c62828; font-weight: 600; }
.sort {
  display: flex;
  gap: 4px;
  padding: 4px;
  border-radius: 14px;
  background: var(--surface-2);
}
.sort button {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 6px;
  border: 0;
  border-radius: 10px;
  background: none;
  font-size: 14px;
  font-weight: 700;
  color: var(--muted);
  cursor: pointer;
}
.sort button.on {
  background: var(--surface);
  color: var(--text);
  box-shadow: var(--shadow-sm);
}
.n {
  min-width: 20px;
  padding: 0 6px;
  border-radius: 999px;
  background: var(--accent);
  color: var(--text);
  font-size: 12px;
}
.empty { color: var(--muted); }
.rows {
  display: grid;
  gap: 10px;
  margin-top: 16px;
}
.row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
  border-radius: 18px;
  background: var(--surface);
  box-shadow: var(--shadow-sm);
  text-decoration: none;
}
.row > img {
  flex: none;
  width: 64px;
  height: 80px;
  border-radius: 12px;
  object-fit: cover;
  background: var(--surface-2);
}
.row > img.fallback { object-fit: contain; padding: 10px; }
.info {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}
.info span {
  font-size: 13px;
  color: var(--muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.info .when { color: var(--text); font-weight: 600; }
.row > svg { flex: none; width: 20px; height: 20px; fill: none; stroke: var(--muted); stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; }
</style>
