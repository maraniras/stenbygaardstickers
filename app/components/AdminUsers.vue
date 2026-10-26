<script setup lang="ts">
// Brugere (navne låst til enheder). Frigiv et navn, hvis nogen har mistet alle
// deres enheder eller har taget et navn, der ikke er deres.
const users = ref<UserSummary[]>()
const confirm = ref('')
const error = ref('')

async function load() {
  try { users.value = await $fetch<UserSummary[]>('/api/admin/users') }
  catch { error.value = 'Kunne ikke hente brugere' }
}

async function release(name: string) {
  error.value = ''
  try {
    await $fetch(`/api/admin/users/${encodeURIComponent(name)}`, { method: 'DELETE' })
    confirm.value = ''
    await load()
  }
  catch (err: any) {
    error.value = err?.data?.statusMessage || 'Kunne ikke frigive navnet'
  }
}

const when = (iso: string) => new Date(iso).toLocaleDateString('da-DK', { day: 'numeric', month: 'short', year: 'numeric' })

onMounted(load)
</script>

<template>
  <section class="users">
    <h2 class="eyebrow">Brugere</h2>
    <p class="hint-text">Navne der er låst til en enhed. Frigiver du et navn, bliver alle dets enheder logget ud, og navnet kan vælges igen.</p>
    <p v-if="error" class="err">{{ error }}</p>
    <ul v-if="users?.length" class="list">
      <li v-for="u in users" :key="u.name">
        <div class="info">
          <b>{{ u.name }}</b>
          <span>{{ u.devices }} {{ u.devices === 1 ? 'enhed' : 'enheder' }} · sidst set {{ when(u.lastSeen) }}</span>
        </div>
        <button v-if="confirm !== u.name" class="chip" @click="confirm = u.name">Frigiv</button>
        <span v-else class="confirm">
          <button class="chip danger" @click="release(u.name)">Ja, frigiv</button>
          <button class="chip" @click="confirm = ''">Fortryd</button>
        </span>
      </li>
    </ul>
    <p v-else-if="users" class="hint-text">Ingen har valgt et navn endnu.</p>
  </section>
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
.hint-text { margin: 0; font-size: 13px; color: var(--muted); }
.err { margin: 0; color: #c62828; font-weight: 600; }
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
.info span { font-size: 13px; color: var(--muted); }
.confirm { display: flex; gap: 6px; }
.danger { background: #fdecea; color: #c62828; }
</style>
