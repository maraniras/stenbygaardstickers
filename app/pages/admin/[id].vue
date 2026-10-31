<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const { admin, all, check, load, save, remove } = useAdmin()

const id = computed(() => String(route.params.id))
const original = computed(() => all.value?.find((s) => s.id === id.value))
const draft = ref<StickerDraft>()
const busy = ref(false)
const working = ref(false)
const error = ref('')

const names = computed(() => countPeople(all.value ?? []).map((p) => p.name))
const invalid = computed(() => {
  const d = draft.value
  if (!d) return ''
  if (!d.title.trim()) return 'Mangler titel'
  if (!d.location) return 'Mangler placering'
  return ''
})

useHead(() => ({ title: `${original.value?.title ?? 'Sticker'} · Admin` }))

onMounted(async () => {
  if (admin.value === null) await check()
  if (!admin.value) return router.replace('/admin')
  if (!all.value) await load()
  if (original.value) draft.value = draftFrom(original.value)
})

async function run(fn: () => Promise<unknown>, then = '/admin') {
  working.value = true
  error.value = ''
  try {
    await fn()
    router.push(then)
  } catch (err: any) {
    error.value = err?.data?.statusMessage || 'Noget gik galt – prøv igen'
  } finally {
    working.value = false
  }
}

const body = (status: StoredSticker['status']) => ({ ...draftBody(draft.value!), status })

function approve() {
  run(() => save(id.value, body('approved')))
}
function saveOnly() {
  run(() => save(id.value, body(original.value!.status)))
}
function unpublish() {
  run(() => save(id.value, body('pending')))
}
function reject() {
  const pending = original.value?.status === 'pending'
  if (
    !confirm(
      pending
        ? 'Afvis og slet denne sticker?'
        : 'Slet stickeren permanent? Det kan ikke fortrydes.',
    )
  )
    return
  run(() => remove(id.value))
}
</script>

<template>
  <div class="page">
    <NuxtLink
      class="back"
      to="/admin"
      aria-label="Tilbage"
    >
      <svg viewBox="0 0 24 24"><path d="M15 5 8 12l7 7" /></svg>
    </NuxtLink>

    <template v-if="draft && original">
      <header>
        <span
          class="status"
          :class="original.status"
          >{{ original.status === 'pending' ? 'Venter på godkendelse' : 'Godkendt' }}</span
        >
        <h1>{{ original.title }}</h1>
      </header>

      <StickerForm
        v-model="draft"
        v-model:busy="busy"
        :names="names"
        admin
      />

      <div class="actions">
        <p
          v-if="error"
          class="err"
        >
          {{ error }}
        </p>
        <p
          v-if="invalid"
          class="hint-text"
        >
          {{ invalid }}
        </p>
        <template v-if="original.status === 'pending'">
          <button
            class="btn"
            :disabled="Boolean(invalid) || busy || working"
            @click="approve"
          >
            Godkend og vis på kortet
          </button>
          <button
            class="btn secondary"
            :disabled="Boolean(invalid) || busy || working"
            @click="saveOnly"
          >
            Gem uden at godkende
          </button>
          <button
            class="btn danger"
            :disabled="working"
            @click="reject"
          >
            Afvis
          </button>
        </template>
        <template v-else>
          <button
            class="btn"
            :disabled="Boolean(invalid) || busy || working"
            @click="saveOnly"
          >
            Gem ændringer
          </button>
          <button
            class="btn secondary"
            :disabled="Boolean(invalid) || busy || working"
            @click="unpublish"
          >
            Skjul fra kortet
          </button>
          <button
            class="btn danger"
            :disabled="working"
            @click="reject"
          >
            Slet
          </button>
        </template>
        <NuxtLink
          v-if="original.status === 'approved'"
          class="view"
          :to="`/sticker/${original.id}`"
          >Se stickeren</NuxtLink
        >
      </div>
    </template>

    <p
      v-else-if="all"
      class="empty"
    >
      Stickeren findes ikke.
    </p>
    <p
      v-else
      class="empty"
    >
      Henter…
    </p>
  </div>
</template>

<style scoped>
.page {
  max-width: 640px;
  margin: 0 auto;
  padding: calc(12px + var(--safe-t)) 16px var(--nav-space);
}
.back {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  margin-left: -8px;
}
.back svg {
  width: 24px;
  height: 24px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.4;
  stroke-linecap: round;
  stroke-linejoin: round;
}
header {
  margin: 8px 0 22px;
}
h1 {
  font-size: 30px;
  overflow-wrap: anywhere;
}
.status {
  display: inline-block;
  margin-bottom: 6px;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}
.status.pending {
  background: var(--accent-soft);
}
.status.approved {
  background: #e3f5e8;
  color: #1b6e34;
}
.actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 28px;
  text-align: center;
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
.view {
  margin-top: 6px;
  font-size: 14px;
  font-weight: 600;
  color: var(--muted);
}
.empty {
  color: var(--muted);
}
</style>
