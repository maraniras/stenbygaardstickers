<script setup lang="ts">
// Tekstfelt til kommentarer med @-forslag: skriv "@Nico" og vælg Nicole. Man kan
// ikke tagge sig selv. Forslagene er dem, der har valgt et navn i appen, og alle der
// står på en sticker (de får først besked, når de vælger deres navn).
const text = defineModel<string>({ required: true })
const props = defineProps<{ placeholder?: string, busy?: boolean, submitLabel?: string, autofocus?: boolean, cancelable?: boolean }>()
const emit = defineEmits<{ submit: [], cancel: [] }>()

const { users } = useUsers()
const { people } = useStickers()
const { name: me } = useUser()

const names = computed(() => {
  const out: string[] = []
  for (const n of [...users.value.map(u => u.name), ...people.value.map(p => p.name)]) {
    if (!out.some(o => sameName(o, n))) out.push(n)
  }
  return out
})
const area = ref<HTMLTextAreaElement>()
const query = ref<string | null>(null)
const active = ref(0)

const options = computed(() => {
  if (query.value === null) return []
  const q = query.value.toLocaleLowerCase('da')
  return names.value
    .filter(n => !(me.value && sameName(n, me.value)))
    .filter(n => n.toLocaleLowerCase('da').startsWith(q) || (q.length > 1 && n.toLocaleLowerCase('da').includes(q)))
    .sort((a, b) => a.localeCompare(b, 'da'))
    .slice(0, 5)
})

watch(options, () => { active.value = 0 })

/** Ser om markøren står lige efter "@noget" */
function detect() {
  const el = area.value
  if (!el) return
  // Feltets egen værdi – v-model er ikke nødvendigvis opdateret endnu ved input
  const before = el.value.slice(0, el.selectionStart ?? el.value.length)
  const m = before.match(/(^|\s)@([\p{L}\p{M}]{0,30})$/u)
  query.value = m ? m[2]! : null
}

function pick(name: string) {
  const el = area.value
  if (!el || query.value === null) return
  const value = el.value
  const end = el.selectionStart ?? value.length
  const start = end - query.value.length - 1
  text.value = `${value.slice(0, start)}@${name} ${value.slice(end)}`
  query.value = null
  nextTick(() => {
    const pos = start + name.length + 2
    el.focus()
    el.setSelectionRange(pos, pos)
    resize()
  })
}

function onKey(e: KeyboardEvent) {
  if (options.value.length) {
    if (e.key === 'ArrowDown') { e.preventDefault(); active.value = (active.value + 1) % options.value.length; return }
    if (e.key === 'ArrowUp') { e.preventDefault(); active.value = (active.value - 1 + options.value.length) % options.value.length; return }
    if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); pick(options.value[active.value]!); return }
    if (e.key === 'Escape') { query.value = null; return }
  }
  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
    e.preventDefault()
    emit('submit')
  }
}

const max = COMMENT_MAX

// Lad et tryk på et forslag nå frem først
function onBlur() {
  setTimeout(() => { query.value = null }, 150)
}

function resize() {
  const el = area.value
  if (!el) return
  el.style.height = 'auto'
  // scrollHeight er uden kanten – uden den kommer der en scrollbar på pc
  const full = el.scrollHeight + el.offsetHeight - el.clientHeight
  el.style.height = `${Math.min(full, 220)}px`
  el.style.overflowY = full > 220 ? 'auto' : 'hidden'
}

watch(text, () => nextTick(resize))
onMounted(() => {
  resize()
  if (props.autofocus) {
    const el = area.value!
    el.focus()
    el.setSelectionRange(text.value.length, text.value.length)
  }
})
</script>

<template>
  <form class="composer" @submit.prevent="emit('submit')">
    <div class="field">
      <textarea
        ref="area"
        v-model="text"
        rows="1"
        :maxlength="max"
        :placeholder="placeholder ?? 'Skriv en kommentar… brug @ for at tagge'"
        autocapitalize="sentences"
        enterkeyhint="enter"
        @input="detect"
        @click="detect"
        @keyup="detect"
        @keydown="onKey"
        @blur="onBlur"
      />
      <ul v-if="options.length" class="menu glass">
        <li v-for="(o, i) in options" :key="o">
          <button type="button" :class="{ on: i === active }" @mousedown.prevent @click="pick(o)">
            <UserAvatar class="avatar" :name="o" />{{ o }}
          </button>
        </li>
      </ul>
    </div>
    <div class="buttons">
      <button v-if="cancelable" type="button" class="link" @click="emit('cancel')">Fortryd</button>
      <button class="send" :disabled="!text.trim() || busy">{{ busy ? '…' : submitLabel ?? 'Send' }}</button>
    </div>
  </form>
</template>

<style scoped>
.composer {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.field { position: relative; }
textarea {
  display: block;
  width: 100%;
  min-height: 46px;
  padding: 12px 14px;
  border: 1px solid var(--hairline);
  border-radius: 16px;
  background: var(--surface);
  font: inherit;
  font-size: 16px;
  line-height: 1.4;
  resize: none;
  outline: none;
}
textarea:focus { border-color: var(--text); }
.menu {
  position: absolute;
  left: 0;
  right: 0;
  bottom: calc(100% + 6px);
  z-index: 20;
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
.menu button.on { background: var(--surface-2); }
.avatar {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--accent);
  color: var(--on-accent);
  font-size: 12px;
  font-weight: 800;
}
.buttons {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 14px;
}
.link {
  padding: 0;
  border: 0;
  background: none;
  font-size: 14px;
  font-weight: 700;
  color: var(--muted);
  cursor: pointer;
}
.send {
  min-height: 38px;
  padding: 0 18px;
  border: 0;
  border-radius: 999px;
  background: var(--ink);
  color: #fff;
  font-weight: 700;
  cursor: pointer;
}
.send:disabled { opacity: .4; cursor: default; }
</style>
