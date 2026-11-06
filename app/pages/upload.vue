<script setup lang="ts">
// Gemt side (link nederst i listen). Indsendte stickers venter på godkendelse i /admin.
const { people } = useStickers()

const { name: me } = useUser()

// Er man logget ind, står man selv som den, der satte den op
function newDraft() {
  const d = emptyDraft()
  if (me.value) d.placedBy = [me.value]
  return d
}

const draftKey = computed(
  () => 'stenbygaard-upload-draft:' + (me.value?.toLocaleLowerCase('da') ?? 'anonymous'),
)
const { draft, restored, clear: clearDraft } = useSavedDraft<StickerDraft>(draftKey, newDraft)
// Navnet kan først være hentet, efter siden er åbnet
watch(me, (n) => {
  if (n && !draft.value.placedBy.length) draft.value.placedBy = [n]
})
const busy = ref(false)
const sending = ref(false)
const error = ref('')
const sent = ref(false)

const missing = computed(() => {
  if (!draft.value.title.trim()) return 'Giv stickeren en titel'
  if (!draft.value.location) return 'Vælg hvor stickeren sidder'
  if (!draft.value.placedBy.length) return 'Skriv hvem der satte den op'
  return ''
})

useHead({ title: 'Tilføj sticker · Stenbygaard Stickers' })

async function submit() {
  if (missing.value || busy.value || sending.value) return
  sending.value = true
  error.value = ''
  try {
    await $fetch('/api/submissions', { method: 'POST', body: draftBody(draft.value) })
    clearDraft()
    sent.value = true
  } catch (err: any) {
    error.value = err?.data?.statusMessage || 'Kunne ikke sende – prøv igen'
  } finally {
    sending.value = false
  }
}

function again() {
  draft.value = newDraft()
  sent.value = false
}

function discardDraft() {
  draft.value = newDraft()
  clearDraft()
  restored.value = false
}
</script>

<template>
  <div class="page">
    <PageHeader
      :title="sent ? 'Sticker indsendt' : 'Ny sticker'"
      back-to="/liste"
      :description="
        sent ? undefined : 'Har du sat Emil op et nyt sted? Den bliver vist, når den er godkendt.'
      "
    />

    <div
      v-if="sent"
      class="done"
    >
      <img
        src="/marker.png"
        alt=""
      />
      <h2>Tak!</h2>
      <p>Stickeren kommer på kortet, så snart den er godkendt.</p>
      <button
        class="btn"
        @click="again"
      >
        Tilføj en til
      </button>
      <NuxtLink
        class="btn secondary"
        to="/"
        >Til kortet</NuxtLink
      >
    </div>

    <template v-else>
      <p
        v-if="restored"
        class="draft-note"
        role="status"
      >
        Din kladde er gendannet på denne enhed.
        <button
          type="button"
          @click="discardDraft"
        >
          Start forfra
        </button>
      </p>
      <StickerForm
        v-model="draft"
        v-model:busy="busy"
        :names="people.map((p) => p.name)"
        locate
      />

      <div class="submit">
        <p
          v-if="error"
          class="err"
        >
          {{ error }}
        </p>
        <button
          class="btn"
          :disabled="Boolean(missing) || busy || sending"
          @click="submit"
        >
          {{ sending ? 'Sender…' : busy ? 'Venter på upload…' : 'Send til godkendelse' }}
        </button>
        <p
          v-if="missing"
          class="hint-text"
        >
          {{ missing }}
        </p>
      </div>
    </template>
  </div>
</template>

<style scoped>
.draft-note {
  padding: 12px;
  border-radius: 12px;
  background: var(--surface);
  font-size: 12px;
  color: var(--muted);
}
.draft-note button {
  min-height: 44px;
  padding: 0 8px;
  border: 0;
  background: none;
  color: var(--text);
  text-decoration: underline;
}
.page {
  max-width: 640px;
  margin: 0 auto;
  padding: calc(20px + var(--safe-t)) 16px var(--nav-space);
}
.done h2 {
  font-size: 28px;
}
.submit {
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
.done {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding-top: 60px;
  text-align: center;
}
.done img {
  width: 110px;
}
.done p {
  margin: 0 0 10px;
  color: var(--muted);
}
.done .btn {
  width: 100%;
  max-width: 320px;
}
</style>
