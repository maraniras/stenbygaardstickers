<script setup lang="ts">
// Én kommentar: navn, tid, tekst med @tags som links, 👍 (hold fingeren på tallet for
// at se hvem), Svar, Rediger (de første 10 min) og Slet.
const props = defineProps<{
  comment: CommentView
  admin: boolean
  now: number
  highlight?: boolean
}>()
const emit = defineEmits<{ reply: [CommentView]; changed: []; likers: [CommentView] }>()

const { name: me, isMe } = useUser()
const own = computed(() => isMe(props.comment.author))
const canEdit = computed(
  () => own.value && props.now - Date.parse(props.comment.createdAt) < COMMENT_EDIT_MS,
)
const editing = ref(false)
const draft = ref('')
const busy = ref(false)
const error = ref('')
const confirmDelete = ref(false)
const likes = ref<CommentLikes>({ ...props.comment.likes })
watch(
  () => props.comment.likes,
  (l) => {
    likes.value = { ...l }
  },
)

/** Teksten delt op i almindelig tekst og @tags */
const parts = computed(() => {
  const out: { text: string; mention?: string }[] = []
  const names = [...props.comment.mentions].sort((a, b) => b.length - a.length)
  if (!names.length) return [{ text: props.comment.text }]
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`@(${names.map(esc).join('|')})(?![\\p{L}\\p{N}])`, 'giu')
  let last = 0
  for (const m of props.comment.text.matchAll(re)) {
    if (m.index! > last) out.push({ text: props.comment.text.slice(last, m.index) })
    out.push({ text: m[0], mention: names.find((n) => sameName(n, m[1]!)) ?? m[1] })
    last = m.index! + m[0].length
  }
  if (last < props.comment.text.length) out.push({ text: props.comment.text.slice(last) })
  return out
})

const when = computed(() => timeAgo(props.comment.createdAt, props.now))

// Som string, så TypeScript ikke prøver at regne ruten ud
const commentUrl = (): string => `/api/comments/${props.comment.id}`

async function call<T>(fn: () => Promise<T>) {
  busy.value = true
  error.value = ''
  try {
    return await fn()
  } catch (err: any) {
    error.value = err?.data?.statusMessage || 'Noget gik galt'
  } finally {
    busy.value = false
  }
}

function startEdit() {
  draft.value = props.comment.text
  editing.value = true
}

async function saveEdit() {
  await call(() =>
    $fetch<CommentData>(commentUrl(), {
      method: 'PUT',
      body: { stickerId: props.comment.stickerId, text: draft.value },
      headers: { 'x-user-token': userToken() },
    }),
  )
  if (!error.value) {
    editing.value = false
    emit('changed')
  }
}

async function remove() {
  await call(() =>
    $fetch<{ ok: boolean }>(commentUrl(), {
      method: 'DELETE',
      query: { sticker: props.comment.stickerId },
      headers: { 'x-user-token': userToken() },
    }),
  )
  if (!error.value) emit('changed')
}

async function toggleLike() {
  if (own.value || busy.value) return
  const on = !likes.value.mine
  const prev = likes.value
  likes.value = {
    ...prev,
    mine: on,
    count: prev.count + (on ? 1 : -1),
    names: me.value
      ? on
        ? [...prev.names, me.value]
        : prev.names.filter((n) => !sameName(n, me.value!))
      : prev.names,
    anonymous: me.value ? prev.anonymous : prev.anonymous + (on ? 1 : -1),
  }
  const r = await call(() =>
    $fetch<CommentLikes>(`${commentUrl()}/like`, {
      method: 'POST',
      body: { stickerId: props.comment.stickerId, device: deviceId(), on },
      headers: { 'x-user-token': userToken() },
    }),
  )
  likes.value = r ?? prev
  if (r) useCommentStats().reload()
}

// Hold fingeren på tallet → liste over dem der har givet 👍
let timer: ReturnType<typeof setTimeout> | undefined
let longPressed = false
function pressStart() {
  longPressed = false
  clearTimeout(timer)
  if (!likes.value.count) return
  timer = setTimeout(() => {
    longPressed = true
    navigator.vibrate?.(15)
    emit('likers', { ...props.comment, likes: likes.value })
  }, 450)
}
function pressEnd() {
  clearTimeout(timer)
}
function onLikeClick() {
  if (longPressed) {
    longPressed = false
    return
  }
  toggleLike()
}
</script>

<template>
  <div
    :id="`comment-${comment.id}`"
    class="comment"
    :class="{ reply: comment.parentId, highlight }"
  >
    <NuxtLink
      class="who"
      :to="personUrl(comment.author)"
    >
      <UserAvatar
        class="avatar"
        :name="comment.author"
      />
    </NuxtLink>
    <div class="main">
      <div class="bubble">
        <div class="meta">
          <NuxtLink
            class="name"
            :to="personUrl(comment.author)"
            >{{ comment.author }}</NuxtLink
          >
          <span class="time"
            >{{ when }}<template v-if="comment.editedAt"> · redigeret</template></span
          >
        </div>
        <CommentComposer
          v-if="editing"
          v-model="draft"
          :busy="busy"
          submit-label="Gem"
          autofocus
          cancelable
          @submit="saveEdit"
          @cancel="editing = false"
        />
        <p
          v-else
          class="text"
        >
          <template
            v-for="(p, i) in parts"
            :key="i"
          >
            <NuxtLink
              v-if="p.mention"
              class="mention"
              :to="personUrl(p.mention)"
              >{{ p.text }}</NuxtLink
            >
            <template v-else>{{ p.text }}</template>
          </template>
        </p>
      </div>

      <div
        v-if="!editing"
        class="actions"
      >
        <button
          class="like"
          :class="{ on: likes.mine, own }"
          :disabled="own"
          :aria-label="own ? `${likes.count} 👍` : likes.mine ? 'Fjern 👍' : 'Giv 👍'"
          :title="own ? 'Du kan ikke give 👍 til din egen kommentar' : undefined"
          @pointerdown="pressStart"
          @pointerup="pressEnd"
          @pointerleave="pressEnd"
          @pointercancel="pressEnd"
          @contextmenu.prevent
          @click="onLikeClick"
        >
          👍<span
            v-if="likes.count"
            class="count"
            >{{ likes.count }}</span
          >
        </button>
        <button
          v-if="own && likes.count"
          class="act"
          @click="emit('likers', { ...comment, likes })"
        >
          Se hvem
        </button>
        <button
          v-if="me"
          class="act"
          @click="emit('reply', comment)"
        >
          Svar
        </button>
        <button
          v-if="canEdit"
          class="act"
          @click="startEdit"
        >
          Rediger
        </button>
        <template v-if="own || admin">
          <button
            v-if="!confirmDelete"
            class="act"
            @click="confirmDelete = true"
          >
            Slet
          </button>
          <template v-else>
            <button
              class="act danger"
              :disabled="busy"
              @click="remove"
            >
              {{ comment.parentId ? 'Ja, slet' : 'Ja, slet (og svar)' }}
            </button>
            <button
              class="act"
              @click="confirmDelete = false"
            >
              Fortryd
            </button>
          </template>
        </template>
      </div>
      <p
        v-if="error"
        class="err"
      >
        {{ error }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.comment {
  display: flex;
  gap: 10px;
  padding: 6px;
  margin: -6px;
  border-radius: 18px;
  transition: background 0.6s;
}
.comment.highlight {
  background: var(--accent-soft);
}
.reply {
  margin-left: 34px;
}
.who {
  flex: none;
  text-decoration: none;
}
.avatar {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--accent);
  color: var(--on-accent);
  font-size: 14px;
  font-weight: 800;
}
.reply .avatar {
  width: 28px;
  height: 28px;
  font-size: 12px;
}
.main {
  flex: 1;
  min-width: 0;
}
.bubble {
  padding: 8px 12px 10px;
  border-radius: 4px 18px 18px 18px;
  background: var(--surface);
  box-shadow: var(--shadow-sm);
}
.meta {
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex-wrap: wrap;
}
.name {
  font-size: 14px;
  font-weight: 800;
  text-decoration: none;
}
.time {
  font-size: 12px;
  color: var(--muted);
}
.text {
  margin: 2px 0 0;
  font-size: 15px;
  line-height: 1.45;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.mention {
  font-weight: 700;
  color: var(--ink);
  text-decoration: none;
  background: var(--accent-soft);
  border-radius: 6px;
  padding: 0 3px;
}
.actions {
  display: flex;
  align-items: center;
  gap: 14px;
  margin: 4px 0 0 8px;
}
.like {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 30px;
  padding: 0 10px;
  border: 0;
  border-radius: 999px;
  background: var(--surface-2);
  font-size: 15px;
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  touch-action: manipulation;
  filter: grayscale(0.9);
}
.like.on {
  background: var(--accent-soft);
  filter: none;
  box-shadow: inset 0 0 0 1.5px var(--accent);
}
.like.own {
  cursor: default;
  opacity: 0.75;
}
.count {
  font-size: 13px;
  font-weight: 800;
  color: var(--text);
}
.act {
  padding: 0;
  border: 0;
  background: none;
  font-size: 13px;
  font-weight: 700;
  color: var(--muted);
  cursor: pointer;
}
.act.danger {
  color: #c62828;
}
.err {
  margin: 4px 0 0 8px;
  font-size: 13px;
  color: #c62828;
  font-weight: 600;
}
</style>
