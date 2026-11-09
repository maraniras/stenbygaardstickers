<script setup lang="ts">
import type { AdventOpening } from '../../shared/types/advent'
const props = defineProps<{ year: number; opening: AdventOpening; preview?: boolean }>()
const emit = defineEmits<{ sent: []; previewSent: [to: string] }>()
const { name } = useUser()
const { users, failed, reload } = useUsers()
const to = ref(props.opening.gift?.to ?? '')
const sending = ref(false),
  error = ref('')
const recipients = computed(() =>
  users.value.filter((user) => !sameName(user.name, name.value ?? '')),
)
const delivered = computed(() => Boolean(props.opening.gift?.deliveredAt))
async function send() {
  if (!to.value || sending.value || delivered.value) return
  if (props.preview) {
    if (recipients.value.some((person) => person.name === to.value)) emit('previewSent', to.value)
    return
  }
  const token = userToken(),
    owner = name.value
  sending.value = true
  error.value = ''
  try {
    await $fetch('/api/games/advent/gift', {
      method: 'POST',
      body: { year: props.year, day: props.opening.day, to: to.value },
      headers: { 'x-user-token': token },
      retry: 0,
      timeout: 30000,
    })
    if (token === userToken() && owner === name.value) emit('sent')
  } catch (e: any) {
    if (token === userToken())
      error.value =
        e?.data?.statusMessage || 'Gaven kunne ikke sendes. Prøv igen; den gives kun én gang.'
  } finally {
    sending.value = false
  }
}
</script>
<template>
  <div class="gift-picker">
    <p
      v-if="delivered"
      role="status"
    >
      {{ preview ? 'Testgaven er givet til' : 'Gaven er sendt til' }} {{ opening.gift?.to }} 🎁
      <small v-if="preview">Kun en prøve · ingen bananer eller notifikationer er sendt.</small>
    </p>
    <template v-else>
      <p v-if="opening.prize.kind === 'friend-gift'">
        Du kan give {{ opening.prize.amount.toLocaleString('da-DK') }} 🍌 til en ven.
      </p>
      <label :for="`gift-recipient-${opening.day}`">Hvem skal have din julegave?</label>
      <select
        :id="`gift-recipient-${opening.day}`"
        v-model="to"
        :disabled="sending || !!opening.gift"
      >
        <option
          value=""
          disabled
        >
          Vælg en bruger
        </option>
        <option
          v-for="person in recipients"
          :key="person.name"
          :value="person.name"
        >
          {{ person.name }}
        </option>
      </select>
      <p v-if="failed">Brugerne kunne ikke hentes. <button @click="reload">Prøv igen</button></p>
      <button
        class="btn"
        :disabled="!to || sending"
        @click="send"
      >
        {{
          preview
            ? 'Giv testgaven'
            : sending
              ? 'Sender…'
              : opening.gift
                ? 'Prøv leveringen igen'
                : 'Send julegaven'
        }}
      </button>
      <small>{{
        preview
          ? 'Kun en prøve · ingen bananer eller notifikationer sendes.'
          : 'Gaven betales af kalenderen og trækkes ikke fra din saldo.'
      }}</small>
      <p
        v-if="error"
        role="alert"
      >
        {{ error }}
      </p>
    </template>
  </div>
</template>
<style scoped>
.gift-picker {
  display: grid;
  gap: 8px;
  padding: 12px 0;
}
label {
  font-size: 13px;
  font-weight: 700;
}
select {
  width: 100%;
  min-height: 44px;
  padding: 8px 12px;
  border-radius: 10px;
  background: var(--surface);
  color: var(--text);
  border: 1px solid var(--hairline);
  font: inherit;
}
.btn {
  min-height: 44px;
  font-size: 13px;
}
p {
  margin: 0;
  font-size: 13px;
}
small {
  display: block;
  color: var(--muted);
  font-size: 11px;
}
</style>
