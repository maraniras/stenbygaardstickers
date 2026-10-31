<script setup lang="ts">
import { normalizeName, validName } from '../../shared/utils/validation'
// Navne som chips. Forslag fra dem der allerede har sat stickers op, men man kan
// også skrive et helt nyt navn og trykke Enter (eller komma).
const model = defineModel<string[]>({ required: true })
const props = defineProps<{ suggestions: string[] }>()

const text = ref('')
const open = ref(false)
const active = ref(0)
const input = ref<HTMLInputElement>()

const query = computed(() => text.value.trim())
const matches = computed(() => {
  const q = query.value.toLocaleLowerCase('da')
  return props.suggestions
    .filter((n) => !model.value.some((m) => sameName(m, n)))
    .filter((n) => !q || n.toLocaleLowerCase('da').includes(q))
    .sort(
      (a, b) =>
        Number(!a.toLocaleLowerCase('da').startsWith(q)) -
        Number(!b.toLocaleLowerCase('da').startsWith(q)),
    )
    .slice(0, 6)
})
const isNew = computed(
  () =>
    query.value &&
    !props.suggestions.some((n) => sameName(n, query.value)) &&
    !model.value.some((n) => sameName(n, query.value)),
)
const options = computed(() => [...matches.value, ...(isNew.value ? [query.value] : [])])

watch(options, () => {
  active.value = 0
})

function add(name: string) {
  const n = normalizeName(name)
  if (!validName(n) || model.value.length >= 12) return
  // Brug den stavemåde der allerede findes
  const known = props.suggestions.find((s) => sameName(s, n)) ?? n
  if (!model.value.some((m) => sameName(m, known))) model.value = [...model.value, known]
  text.value = ''
  input.value?.focus()
}

function remove(i: number) {
  model.value = model.value.filter((_, j) => j !== i)
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault()
    const pick = open.value && options.value.length ? options.value[active.value] : query.value
    if (pick) add(pick)
  } else if (e.key === 'Backspace' && !text.value && model.value.length) {
    remove(model.value.length - 1)
  } else if (e.key === 'ArrowDown') {
    e.preventDefault()
    open.value = true
    active.value = Math.min(active.value + 1, options.value.length - 1)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    active.value = Math.max(active.value - 1, 0)
  } else if (e.key === 'Escape') {
    open.value = false
  }
}

function onBlur() {
  // Lad et klik på et forslag nå frem først
  setTimeout(() => {
    open.value = false
    if (query.value) add(query.value)
  }, 150)
}
</script>

<template>
  <div class="names">
    <div
      class="box"
      @click="input?.focus()"
    >
      <span
        v-for="(n, i) in model"
        :key="n"
        class="chip tag"
      >
        <UserAvatar
          class="avatar"
          :name="n"
        />{{ n }}
        <button
          type="button"
          :aria-label="`Fjern ${n}`"
          @click.stop="remove(i)"
        >
          <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18" /></svg>
        </button>
      </span>
      <input
        ref="input"
        aria-label="Sat op af"
        maxlength="30"
        v-model="text"
        :placeholder="model.length ? 'Tilføj flere…' : 'Skriv et navn…'"
        autocomplete="off"
        autocapitalize="words"
        enterkeyhint="done"
        @focus="open = true"
        @input="open = true"
        @keydown="onKey"
        @blur="onBlur"
      />
    </div>
    <ul
      v-if="open && options.length"
      class="menu glass"
    >
      <li
        v-for="(o, i) in options"
        :key="o"
      >
        <button
          type="button"
          :class="{ on: i === active }"
          @mousedown.prevent
          @click="add(o)"
        >
          <template v-if="isNew && o === query">
            <span class="plus">+</span> Tilføj »{{ o }}«
          </template>
          <template v-else>
            <UserAvatar
              class="avatar"
              :name="o"
            />{{ o }}
          </template>
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.names {
  position: relative;
}
.box {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  min-height: 50px;
  padding: 7px 8px;
  border: 1px solid var(--hairline);
  border-radius: 14px;
  background: var(--surface);
  box-shadow: var(--shadow-sm);
  cursor: text;
}
.box:focus-within {
  border-color: var(--text);
}
.box input {
  flex: 1;
  min-width: 120px;
  padding: 6px !important;
  border: 0 !important;
  box-shadow: none !important;
  background: none !important;
}
.tag {
  padding: 3px 4px 3px 3px;
  background: var(--accent-soft);
  font-size: 14px;
}
.tag button {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: none;
  cursor: pointer;
}
.tag svg,
.menu svg {
  width: 12px;
  height: 12px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.6;
  stroke-linecap: round;
}
.avatar {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--accent);
  color: var(--on-accent);
  font-size: 12px;
  font-weight: 800;
}
.menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  z-index: 600;
  margin: 0;
  padding: 6px;
  border-radius: 16px;
  list-style: none;
}
.menu button {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 10px;
  border: 0;
  border-radius: 10px;
  background: none;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
}
.menu button.on {
  background: var(--surface-2);
}
.plus {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--ink);
  color: #fff;
  font-weight: 800;
}
</style>
