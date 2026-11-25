<script setup lang="ts">
import type { AdminTransactions } from '../../shared/types/admin-transactions'

const props = defineProps<{ name: string }>()
const emit = defineEmits<{ close: [] }>()
const data = ref<AdminTransactions>()
const pending = ref(true)
const error = ref('')
const search = ref('')
let revision = 0
const transactions = computed(() => {
  const query = search.value.trim().toLocaleLowerCase('da')
  return (data.value?.history ?? []).filter(
    (item) =>
      !query ||
      item.label.toLocaleLowerCase('da').includes(query) ||
      String(item.amount).includes(query),
  )
})
const number = (amount: number) => amount.toLocaleString('da-DK')
const when = (iso: string) =>
  new Date(iso).toLocaleString('da-DK', {
    timeZone: 'Europe/Copenhagen',
    dateStyle: 'medium',
    timeStyle: 'short',
  })
async function load() {
  const request = ++revision
  pending.value = true
  error.value = ''
  data.value = undefined
  search.value = ''
  try {
    const result = await $fetch<AdminTransactions>(
      `/api/admin/users/${encodeURIComponent(props.name)}/transactions`,
    )
    if (request === revision) data.value = result
  } catch (err: any) {
    if (request === revision)
      error.value = err?.data?.statusMessage || 'Kunne ikke hente transaktionerne.'
  } finally {
    if (request === revision) pending.value = false
  }
}
watch(() => props.name, load, { immediate: true })
onBeforeUnmount(() => {
  revision++
})
</script>

<template>
  <AppDialog
    :label="`Banantransaktioner for ${name}`"
    @close="emit('close')"
  >
    <section class="transactions">
      <header>
        <div>
          <span class="eyebrow">Banantransaktioner</span>
          <h2>{{ name }}</h2>
        </div>
        <AppCloseButton
          class="close"
          label="Luk transaktioner"
          @click="emit('close')"
        />
      </header>
      <p
        v-if="pending"
        role="status"
      >
        Henter transaktioner…
      </p>
      <div
        v-else-if="error"
        role="alert"
      >
        <p>{{ error }}</p>
        <button
          type="button"
          class="chip"
          @click="load"
        >
          Prøv igen
        </button>
      </div>
      <template v-else-if="data">
        <p class="balance">
          Nuværende saldo <strong>{{ number(data.balance) }} 🍌</strong>
        </p>
        <p class="hint">
          Alle {{ data.history.length }} gemte transaktioner · nyeste først. Historikken gemmer
          højst 250 poster pr. bruger. Tidspunkter er dansk tid.
        </p>
        <input
          v-model="search"
          type="search"
          placeholder="Søg i transaktioner"
          aria-label="Søg i transaktioner"
        />
        <ul v-if="transactions.length">
          <li
            v-for="(item, index) in transactions"
            :key="item.id + ':' + index"
          >
            <div>
              <b>{{ item.label }}</b
              ><time :datetime="item.at">{{ when(item.at) }}</time>
            </div>
            <strong :class="{ positive: item.amount > 0, negative: item.amount < 0 }"
              >{{ item.amount > 0 ? '+' : '' }}{{ number(item.amount) }} 🍌</strong
            >
          </li>
        </ul>
        <p
          v-else
          class="hint"
        >
          {{
            data.history.length
              ? 'Ingen transaktioner matcher din søgning.'
              : 'Brugeren har ingen gemte banantransaktioner.'
          }}
        </p>
      </template>
    </section>
  </AppDialog>
</template>

<style scoped>
.transactions {
  padding: 22px 18px max(24px, env(safe-area-inset-bottom));
}
header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
h2 {
  margin: 4px 0 16px;
  overflow-wrap: anywhere;
}
.close {
  min-width: 44px;
  min-height: 44px;
  align-self: start;
  border: 0;
  border-radius: 50%;
  background: var(--surface-2);
  color: var(--text);
  font-size: 26px;
}
.balance {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
.hint,
time {
  color: var(--muted);
  font-size: 13px;
}
input {
  width: 100%;
  margin: 8px 0;
}
ul {
  list-style: none;
  padding: 0;
  margin: 0;
}
li {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  padding: 14px 0;
  border-bottom: 1px solid var(--hairline);
}
li div {
  display: grid;
  gap: 5px;
  min-width: 0;
  overflow-wrap: anywhere;
}
li > strong {
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.positive {
  color: #26934d;
}
.negative {
  color: #d55765;
}
</style>
