<script setup lang="ts">
import { CROSSWORDS } from '../../../shared/utils/crosswords'
import { adminChristmasVisible } from '../../../shared/utils/admin-navigation'
const { admin, all, check, login, logout, load } = useAdmin()
const route = useRoute()
const sections = [
  { id: 'jul', title: 'Jul', icon: '🎄', description: 'Kalender, pakkeleg og beskeder' },
  { id: 'stickers', title: 'Stickers', icon: '📍', description: 'Godkendelser og kommentarer' },
  { id: 'casino', title: 'Casino', icon: '🎲', description: 'Spil og indstillinger' },
  { id: 'krydsord', title: 'Krydsord', icon: '🧩', description: 'Starttider, facit og deltagere' },
  { id: 'brugere', title: 'Brugere', icon: '👥', description: 'Profiler og enheder' },
  { id: 'system', title: 'System', icon: '⚙️', description: 'Version, backup og drift' },
]
const section = computed(() => sections.find((item) => item.id === route.query.section))
const christmasAdminVisible = ref(false)
async function loadSection() {
  if (admin.value && section.value?.id === 'stickers') await load()
}
watch(() => route.query.section, loadSection)
const tab = ref<'pending' | 'approved'>('pending')
const password = ref('')
const error = ref('')
const loggingIn = ref(false)

useHead({ title: 'Admin · Stenbygaard Stickers' })

const pending = computed(() =>
  (all.value ?? [])
    .filter((s) => s.status === 'pending')
    .sort((a, b) => (b.submittedAt ?? '').localeCompare(a.submittedAt ?? '')),
)
const approved = computed(() => (all.value ?? []).filter((s) => s.status === 'approved'))
const shown = computed(() => (tab.value === 'pending' ? pending.value : approved.value))

onMounted(async () => {
  christmasAdminVisible.value = adminChristmasVisible()
  if (await check()) await loadSection()
})

async function submit() {
  loggingIn.value = true
  error.value = ''
  try {
    await login(password.value)
    password.value = ''
    await loadSection()
  } catch (err: any) {
    error.value = err?.data?.statusMessage || 'Kunne ikke logge ind'
  } finally {
    loggingIn.value = false
  }
}

function submitted(s: StoredSticker) {
  if (!s.submittedAt) return ''
  return new Date(s.submittedAt).toLocaleString('da-DK', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<template>
  <div class="page">
    <PageHeader
      :title="section?.title || 'Admin'"
      :back-to="section ? '/admin' : '/mig'"
      :back-label="section ? 'Tilbage til admin' : 'Tilbage til indstillinger'"
    >
      <template #actions>
        <button
          v-if="admin"
          class="chip"
          @click="logout"
        >
          Log ud
        </button>
      </template>
    </PageHeader>

    <form
      v-if="admin === false"
      class="form login"
      @submit.prevent="submit"
    >
      <label class="field">
        <span class="eyebrow">Adgangskode</span>
        <input
          v-model="password"
          type="password"
          autocomplete="current-password"
        />
      </label>
      <p
        v-if="error"
        class="err"
      >
        {{ error }}
      </p>
      <button
        class="btn"
        :disabled="!password || loggingIn"
      >
        {{ loggingIn ? 'Logger ind…' : 'Log ind' }}
      </button>
    </form>

    <template v-else-if="admin">
      <nav
        v-if="!section"
        class="admin-menu"
        aria-label="Adminområder"
      >
        <NuxtLink
          v-for="item in sections.filter((item) => item.id !== 'jul' || christmasAdminVisible)"
          :key="item.id"
          :to="{ path: '/admin', query: { section: item.id } }"
          class="admin-menu-item"
        >
          <span aria-hidden="true">{{ item.icon }}</span
          ><strong>{{ item.title }}</strong
          ><small>{{ item.description }}</small>
        </NuxtLink>
      </nav>
      <template v-else-if="section.id === 'stickers'">
        <div
          class="sort"
          role="tablist"
        >
          <button
            :class="{ on: tab === 'pending' }"
            @click="tab = 'pending'"
          >
            Venter
            <span
              v-if="pending.length"
              class="n"
              >{{ pending.length }}</span
            >
          </button>
          <button
            :class="{ on: tab === 'approved' }"
            @click="tab = 'approved'"
          >
            Godkendte
          </button>
        </div>

        <p
          v-if="!shown.length"
          class="empty"
        >
          {{
            tab === 'pending'
              ? 'Ingen stickers venter på godkendelse.'
              : 'Ingen godkendte stickers.'
          }}
        </p>

        <div class="rows">
          <NuxtLink
            v-for="s in shown"
            :key="s.id"
            class="row"
            :to="`/admin/${s.id}`"
          >
            <img
              v-if="thumbnail(s)"
              :src="thumbnail(s)"
              alt=""
            />
            <img
              v-else
              src="/marker.png"
              alt=""
              class="fallback"
            />
            <div class="info">
              <b>{{ s.title }}</b>
              <span
                ><CountryFlag
                  v-if="s.countryCode"
                  :code="s.countryCode"
                />
                {{ s.city || 'Ukendt sted' }} · {{ formatDate(s.date) }}</span
              >
              <span
                >{{ formatNames(s.placedBy) || 'Ingen navne' }} · {{ s.media.length }}
                {{ s.media.length === 1 ? 'medie' : 'medier' }}</span
              >
              <span
                v-if="s.status === 'pending' && s.submittedAt"
                class="when"
                >Indsendt {{ submitted(s) }}</span
              >
            </div>
            <svg viewBox="0 0 24 24"><path d="m9 5 7 7-7 7" /></svg>
          </NuxtLink>
        </div>

        <NuxtLink
          class="comments-link"
          to="/admin/kommentarer"
        >
          <span>💬</span>
          <b>Kommentarer</b>
          <svg viewBox="0 0 24 24"><path d="m9 5 7 7-7 7" /></svg>
        </NuxtLink>

        <AdminPush
      /></template>
      <AdminJackSettings v-else-if="section.id === 'casino'" />
      <AdminUsers v-else-if="section.id === 'brugere'" />
      <template v-else-if="section.id === 'jul'">
        <NuxtLink
          class="chip advent-link"
          to="/admin/julekalender"
          >Julekalender · præmier og åbninger →</NuxtLink
        >
        <NuxtLink
          class="chip advent-link"
          to="/admin/pakkeleg"
          >Pakkeleg · præmier og udlevering →</NuxtLink
        >
        <NuxtLink
          class="chip advent-link"
          to="/admin/julebeskeder"
          >Julebeskeder · tidspunkter og status →</NuxtLink
        >
      </template>
      <template v-else-if="section.id === 'krydsord'">
        <NuxtLink
          v-for="(puzzle, id) in CROSSWORDS"
          :key="id"
          class="puzzle-link"
          :to="{ path: '/admin/krydsord', query: { id } }"
          ><strong>{{ puzzle.title }}</strong
          ><span>Åbningstid, facit, deltagere og præmier →</span></NuxtLink
        >
      </template>
      <template v-else-if="section.id === 'system'"><AdminSystem /><AdminBackups /></template>
    </template>

    <p
      v-else
      class="empty"
    >
      Henter…
    </p>
  </div>
</template>

<style scoped>
.admin-menu {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}
.admin-menu-item {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 10px;
  min-height: 150px;
  padding: 20px 16px;
  border: 1px solid var(--hairline);
  border-radius: 22px;
  background: var(--surface);
  box-shadow: var(--shadow-sm);
  color: var(--text);
  text-decoration: none;
}
.admin-menu-item > span {
  font-size: 30px;
}
.admin-menu-item strong {
  font-size: 18px;
}
.admin-menu-item small {
  font-size: 12px;
  color: var(--muted);
  line-height: 1.5;
  overflow-wrap: anywhere;
}
.puzzle-link {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 16px 0;
  padding: 22px;
  border: 1px solid var(--hairline);
  border-radius: 20px;
  background: var(--surface);
  color: var(--text);
  text-decoration: none;
}
.puzzle-link span {
  color: var(--muted);
  font-size: 13px;
}
.advent-link {
  display: flex;
  align-items: center;
  min-height: 76px;
  margin-top: 16px;
  padding: 20px;
  border-radius: 18px;
  font-size: 15px;
  line-height: 1.5;
  text-align: left;
  white-space: normal;
}
.page {
  max-width: 640px;
  margin: 0 auto;
  padding: calc(20px + var(--safe-t)) 16px 20px;
}
.login {
  max-width: 360px;
}
.err {
  margin: 0;
  color: #c62828;
  font-weight: 600;
}
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
  color: var(--on-accent);
  font-size: 12px;
}
.empty {
  color: var(--muted);
}
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
.row > img.fallback {
  object-fit: contain;
  padding: 10px;
}
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
.info .when {
  color: var(--text);
  font-weight: 600;
}
.comments-link {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 28px;
  padding: 14px 16px;
  border-radius: 18px;
  background: var(--surface);
  box-shadow: var(--shadow-sm);
  text-decoration: none;
}
.comments-link span {
  font-size: 22px;
}
.comments-link b {
  flex: 1;
}
.comments-link svg {
  width: 20px;
  height: 20px;
  fill: none;
  stroke: var(--muted);
  stroke-width: 2.2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.row > svg {
  flex: none;
  width: 20px;
  height: 20px;
  fill: none;
  stroke: var(--muted);
  stroke-width: 2.2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
</style>
