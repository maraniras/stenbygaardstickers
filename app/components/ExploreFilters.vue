<script setup lang="ts">
const emit = defineEmits<{ close: [] }>()
const route = useRoute(),
  router = useRouter()
const { stickers, people } = useStickers()
const by = ref(typeof route.query.by === 'string' ? route.query.by : '')
const country = ref(typeof route.query.country === 'string' ? route.query.country : '')
const countries = computed(() =>
  [
    ...new Map(
      stickers.value.map((s) => [s.countryCode, { code: s.countryCode, name: s.country }]),
    ).values(),
  ].sort((a, b) => a.name.localeCompare(b.name, 'da')),
)
const resultCount = computed(
  () =>
    stickers.value.filter(
      (s) =>
        (!by.value || s.placedBy.some((n) => sameName(n, by.value))) &&
        (!country.value || s.countryCode === country.value),
    ).length,
)
const dialog = ref<HTMLDialogElement>()
onMounted(() => dialog.value?.showModal())
onBeforeUnmount(() => dialog.value?.close())
function clearFilters() {
  by.value = ''
  country.value = ''
}
async function apply() {
  const { by: _, country: __, ...query } = route.query
  await router.replace({
    path: route.path,
    query: {
      ...query,
      ...(by.value ? { by: by.value } : {}),
      ...(country.value ? { country: country.value } : {}),
    },
  })
  dialog.value?.close()
}
</script>
<template>
  <Teleport to="body"
    ><dialog
      ref="dialog"
      class="filters-dialog"
      aria-labelledby="filters-title"
      @close="emit('close')"
      @click="$event.target === dialog && dialog?.close()"
    >
      <form
        class="panel"
        @submit.prevent="apply"
      >
        <header>
          <h2 id="filters-title">Filtrér stickers</h2>
          <AppCloseButton
            class="page-icon-button"
            label="Luk filtre"
            @click="dialog?.close()"
          />
        </header>
        <label
          >Land<select v-model="country">
            <option value="">Alle lande</option>
            <option
              v-for="c in countries"
              :key="c.code"
              :value="c.code"
            >
              {{ c.name }}
            </option>
          </select></label
        >
        <label
          >Sat op af<select v-model="by">
            <option value="">Alle personer</option>
            <option
              v-if="by && !people.some((p) => sameName(p.name, by))"
              :value="by"
            >
              {{ by }}
            </option>
            <option
              v-for="p in people"
              :key="p.name"
              :value="p.name"
            >
              {{ p.name }}
            </option>
          </select></label
        >
        <button
          type="button"
          class="clear"
          @click="clearFilters"
        >
          Nulstil filtre
        </button>
        <button class="btn">
          Vis {{ resultCount }} {{ resultCount === 1 ? 'sticker' : 'stickers' }}
        </button>
      </form>
    </dialog></Teleport
  >
</template>
<style scoped>
.filters-dialog {
  position: fixed;
  inset: auto 0 0;
  width: min(100%, 520px);
  max-height: 90dvh;
  margin: auto auto 0;
  padding: 0;
  border: 1px solid var(--hairline);
  border-radius: 24px 24px 0 0;
  background: var(--surface);
  color: var(--text);
  box-shadow: var(--shadow);
}
.filters-dialog::backdrop {
  background: #0008;
}
.panel {
  display: grid;
  gap: 18px;
  padding: 20px 20px calc(20px + env(safe-area-inset-bottom));
}
header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
h2 {
  margin: 0;
  font-size: 22px;
}
label {
  display: grid;
  gap: 8px;
  font-size: 13px;
  font-weight: 700;
}
select {
  width: 100%;
  min-height: 48px;
  padding: 10px;
  border: 1px solid var(--hairline);
  border-radius: 12px;
  background: var(--surface-2);
  color: var(--text);
  font: inherit;
  font-size: 16px;
}
.clear {
  justify-self: start;
  min-height: 44px;
  border: 0;
  background: none;
  color: var(--muted);
  text-decoration: underline;
  cursor: pointer;
}
</style>
