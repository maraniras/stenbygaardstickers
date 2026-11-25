<script setup lang="ts">
import { compareAdminUsers } from '../../shared/utils/admin-user-order'
// Hjælp en bruger tilbage på sin eksisterende profil, hvis alle enheder er logget ud.
const users = ref<UserSummary[]>()
const orderedUsers = computed(() => [...(users.value ?? [])].sort(compareAdminUsers))
const recovery = ref<{ name: string; code: string; expiresAt: string }>()
const busy = ref(false)
const error = ref('')
const transactionUser = ref<string>()
const { reload: reloadPublicUsers } = useUsers()

async function changeStatus(user: UserSummary) {
  if (busy.value) return
  busy.value = true
  error.value = ''
  try {
    const result = await $fetch<{ name: string; deactivatedAt: string | null }>(
      `/api/admin/users/${encodeURIComponent(user.name)}/status`,
      { method: 'PUT', body: { active: !!user.deactivatedAt } },
    )
    user.deactivatedAt = result.deactivatedAt ?? undefined
    await reloadPublicUsers()
  } catch (err: any) {
    error.value = err?.data?.statusMessage || 'Kunne ikke ændre brugerens status.'
  } finally {
    busy.value = false
  }
}

async function load() {
  try {
    users.value = await $fetch<UserSummary[]>('/api/admin/users')
  } catch {
    error.value = 'Kunne ikke hente brugere'
  }
}

async function recover(name: string) {
  if (busy.value) return
  busy.value = true
  recovery.value = undefined
  error.value = ''
  try {
    const code = await $fetch<PairCode>(`/api/admin/users/${encodeURIComponent(name)}/code`, {
      method: 'POST',
    })
    recovery.value = { name, ...code }
  } catch (err: any) {
    error.value = err?.data?.statusMessage || 'Kunne ikke lave en login-kode'
  } finally {
    busy.value = false
  }
}

const when = (iso: string) =>
  new Date(iso).toLocaleDateString('da-DK', { day: 'numeric', month: 'short', year: 'numeric' })

onMounted(load)
</script>

<template>
  <section class="users">
    <h2 class="eyebrow">Brugere</h2>
    <p class="hint-text">
      Profiler bevares, også når alle enheder er logget ud. Har nogen mistet adgangen, kan du give
      dem en kode til deres eksisterende profil.
    </p>
    <p class="hint-text">
      Deaktiverede brugere er skjult fra ranglisterne og kan ikke deltage i spil, lodtrækninger
      eller modtage nye julegaver. Profil og historik bevares, og du kan altid genaktivere dem.
    </p>
    <p
      v-if="error"
      class="err"
    >
      {{ error }}
    </p>
    <div
      v-if="recovery"
      class="recovery"
      role="status"
    >
      <b>Login-kode til {{ recovery.name }}</b>
      <strong class="code">{{ recovery.code.slice(0, 3) }} {{ recovery.code.slice(3) }}</strong>
      <p class="hint-text">
        Indtast den under »Mig → Jeg har en kode«. Kan bruges én gang inden
        {{
          new Date(recovery.expiresAt).toLocaleTimeString('da-DK', {
            hour: '2-digit',
            minute: '2-digit',
          })
        }}. Del den kun med personen, der ejer profilen.
      </p>
      <button
        class="chip"
        @click="recovery = undefined"
      >
        Skjul kode
      </button>
    </div>
    <ul
      v-if="users?.length"
      class="list"
    >
      <li
        v-for="u in orderedUsers"
        :key="u.name"
        :class="{ inactive: !!u.deactivatedAt }"
      >
        <div class="info">
          <b>{{ u.name }}</b>
          <span
            v-if="u.deactivatedAt"
            class="inactive-label"
            >Deaktiveret</span
          >
          <span
            >{{ u.devices }} {{ u.devices === 1 ? 'enhed' : 'enheder' }} · sidst set
            {{ when(u.lastSeen) }}</span
          >
        </div>
        <div class="actions">
          <button
            type="button"
            class="chip"
            :disabled="busy"
            :aria-label="`${u.deactivatedAt ? 'Genaktiver' : 'Deaktiver'} ${u.name}`"
            @click="changeStatus(u)"
          >
            {{ u.deactivatedAt ? 'Genaktiver' : 'Deaktiver' }}
          </button>
          <button
            type="button"
            class="chip"
            :aria-label="`Se banantransaktioner for ${u.name}`"
            @click="transactionUser = u.name"
          >
            Banantransaktioner
          </button>
          <button
            class="chip"
            :disabled="busy"
            :aria-label="`Gendan adgang for ${u.name}`"
            @click="recover(u.name)"
          >
            Gendan adgang
          </button>
        </div>
      </li>
    </ul>
    <p
      v-else-if="users"
      class="hint-text"
    >
      Ingen har valgt et navn endnu.
    </p>
  </section>
  <AdminUserTransactions
    v-if="transactionUser"
    :key="transactionUser"
    :name="transactionUser"
    @close="transactionUser = undefined"
  />
</template>

<style scoped>
.users {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 40px;
  padding-top: 20px;
  border-top: 1px solid var(--hairline);
}
.hint-text {
  margin: 0;
  font-size: 13px;
  color: var(--muted);
}
.err {
  margin: 0;
  color: #c62828;
  font-weight: 600;
}
.list {
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 14px;
}
.list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 2px;
  border-bottom: 1px solid var(--hairline);
}
.info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.list li.inactive {
  margin-top: 10px;
  padding: 14px 12px;
  border: 1px dashed var(--hairline);
  border-left: 3px solid var(--muted);
  border-radius: 14px;
  background: var(--surface-2);
}
.inactive .info b {
  color: var(--muted);
}
.info .inactive-label {
  align-self: flex-start;
  margin: 6px 0;
  padding: 4px 8px;
  border: 1px solid var(--hairline);
  border-radius: 999px;
  background: var(--surface);
  color: var(--text);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}
.actions .chip {
  min-height: 44px;
}
@media (max-width: 520px) {
  .list li {
    align-items: stretch;
    flex-direction: column;
    padding: 14px 2px;
  }
  .actions {
    justify-content: flex-start;
  }
}
.info span {
  font-size: 13px;
  color: var(--muted);
}
.recovery {
  display: grid;
  gap: 10px;
  padding: 16px;
  border-radius: 16px;
  background: var(--surface-2);
}
.code {
  font-size: 28px;
  letter-spacing: 0.1em;
  font-variant-numeric: tabular-nums;
}
.recovery .chip {
  justify-self: start;
  background: var(--surface);
}
</style>
