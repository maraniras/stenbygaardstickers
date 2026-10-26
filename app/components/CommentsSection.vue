<script setup lang="ts">
// Kommentarer under en sticker. Alle kan læse og give 👍; kun med et navn kan man
// skrive. Svar ligger under den kommentar, de svarer på (ét niveau).
const props = defineProps<{ stickerId: string }>()

const route = useRoute()
const router = useRouter()
const { name: me } = useUser()
const { admin, check } = useAdmin()
const { reload: reloadStats } = useCommentStats()

const comments = ref<CommentView[]>()
const error = ref('')
const text = ref('')
const sending = ref(false)
const replyTo = ref<CommentView>()
const replyText = ref('')
const highlight = ref('')
const likers = ref<CommentView>()

// Til "5 min." og om man stadig kan rette
const now = ref(Date.now())
let ticker: ReturnType<typeof setInterval> | undefined

async function load() {
  try {
    comments.value = await $fetch<CommentView[]>('/api/comments', {
      query: { sticker: props.stickerId, device: deviceId() },
      headers: { 'x-user-token': userToken() },
    })
  }
  catch {
    error.value = 'Kunne ikke hente kommentarer'
  }
}

const threads = computed(() => {
  const list = comments.value ?? []
  return list.filter(c => !c.parentId).map(c => ({ ...c, replies: list.filter(r => r.parentId === c.id) }))
})

async function send(parent?: CommentView) {
  const body = parent ? replyText.value : text.value
  if (!body.trim()) return
  sending.value = true
  error.value = ''
  try {
    const c = await $fetch<CommentView>('/api/comments', {
      method: 'POST',
      body: { stickerId: props.stickerId, text: body, parentId: parent?.id },
      headers: { 'x-user-token': userToken() },
    })
    if (parent) {
      replyText.value = ''
      replyTo.value = undefined
    }
    else {
      text.value = ''
    }
    await load()
    flash(c.id)
    reloadStats()
  }
  catch (err: any) {
    error.value = err?.data?.statusMessage || 'Kunne ikke sende'
  }
  finally {
    sending.value = false
  }
}

function startReply(c: CommentView) {
  replyTo.value = c
  // Svar på en anden end en selv starter med et tag
  replyText.value = me.value && !sameName(c.author, me.value) ? `@${c.author} ` : ''
}

/** Den tråd et svar skal lægges i */
const replyThread = computed(() => replyTo.value?.parentId ?? replyTo.value?.id)

function flash(id: string, settle = false) {
  highlight.value = id
  const scroll = () => document.getElementById(`comment-${id}`)?.scrollIntoView({ behavior: settle ? 'instant' : 'smooth', block: 'center' })
  nextTick(scroll)
  // Lige efter et sideskift nulstiller app.vue scrollen, og billederne skubber siden
  // ned, mens de hentes – så vi scroller igen, når siden har sat sig
  if (settle) {
    setTimeout(scroll, 350)
    setTimeout(scroll, 1200)
  }
  setTimeout(() => { if (highlight.value === id) highlight.value = '' }, settle ? 3500 : 2500)
}

async function changed() {
  await load()
  reloadStats()
}

onMounted(async () => {
  check()
  await load()
  ticker = setInterval(() => { now.value = Date.now() }, 15_000)
  // Åbnet fra en notifikation: /sticker/<id>?comment=<id>
  const id = route.query.comment
  if (typeof id === 'string') {
    flash(id, true)
    const { comment: _, ...rest } = route.query
    router.replace({ query: rest })
  }
})
onBeforeUnmount(() => clearInterval(ticker))
</script>

<template>
  <section class="comments">
    <h2 class="eyebrow">Kommentarer<span v-if="comments?.length"> · {{ comments.length }}</span></h2>

    <p v-if="comments && !comments.length" class="empty">Ingen kommentarer endnu{{ me ? ' – skriv den første!' : '.' }}</p>

    <div class="list">
      <div v-for="t in threads" :key="t.id" class="thread">
        <CommentItem :comment="t" :admin="Boolean(admin)" :now="now" :highlight="highlight === t.id" @reply="startReply" @changed="changed" @likers="likers = $event" />
        <CommentItem
          v-for="r in t.replies"
          :key="r.id"
          :comment="r"
          :admin="Boolean(admin)"
          :now="now"
          :highlight="highlight === r.id"
          @reply="startReply"
          @changed="changed"
          @likers="likers = $event"
        />
        <div v-if="replyTo && replyThread === t.id" class="reply-box">
          <CommentComposer
            v-model="replyText"
            :busy="sending"
            :placeholder="`Svar ${replyTo.author}…`"
            submit-label="Svar"
            autofocus
            cancelable
            @submit="send(replyTo)"
            @cancel="replyTo = undefined"
          />
        </div>
      </div>
    </div>

    <CommentComposer v-if="me" v-model="text" :busy="sending && !replyTo" @submit="send()" />
    <NuxtLink v-else class="login" to="/mig">
      <span>💬</span> Vælg dit navn under »Mig« for at skrive kommentarer
    </NuxtLink>
    <p v-if="error" class="err">{{ error }}</p>

    <Transition name="fade">
      <div v-if="likers" class="backdrop" @click.self="likers = undefined">
        <div class="sheet" role="dialog" aria-label="Har givet 👍">
          <h3>👍 {{ likers.likes.count }}</h3>
          <ul>
            <li v-for="n in likers.likes.names" :key="n">
              <NuxtLink :to="personUrl(n)" @click="likers = undefined">
                <UserAvatar class="avatar" :name="n" />{{ n }}
              </NuxtLink>
            </li>
            <li v-if="likers.likes.anonymous" class="anon">
              <span class="avatar">?</span>{{ likers.likes.anonymous }} {{ likers.likes.anonymous === 1 ? 'anonym' : 'anonyme' }}
            </li>
          </ul>
          <button class="btn secondary" @click="likers = undefined">Luk</button>
        </div>
      </div>
    </Transition>
  </section>
</template>

<style scoped>
.comments {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-top: 8px;
}
.comments h2 { margin: 0 0 2px 4px; }
.empty { margin: 0; color: var(--muted); font-size: 14px; }
.list {
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.thread {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.reply-box { margin-left: 34px; }
.login {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border-radius: 16px;
  background: var(--surface);
  box-shadow: var(--shadow-sm);
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
}
.login span { font-size: 20px; }
.err { margin: 0; color: #c62828; font-weight: 600; font-size: 14px; }
.backdrop {
  position: fixed;
  inset: 0;
  z-index: 1100;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgba(10, 10, 14, .4);
}
.sheet {
  width: 100%;
  max-width: 480px;
  max-height: 70vh;
  overflow-y: auto;
  padding: 18px 18px calc(18px + var(--safe-b));
  border-radius: 26px 26px 0 0;
  background: var(--surface);
}
.sheet h3 { font-size: 20px; margin-bottom: 8px; }
.sheet ul { margin: 0 0 14px; padding: 0; list-style: none; }
.sheet li a, .sheet li.anon {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 2px;
  font-weight: 600;
  text-decoration: none;
}
.sheet li.anon { color: var(--muted); }
.sheet .avatar {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--accent);
  color: var(--on-accent);
  font-size: 13px;
  font-weight: 800;
}
.sheet li.anon .avatar { background: var(--surface-2); color: var(--muted); }
.sheet .btn { width: 100%; }
.fade-enter-active, .fade-leave-active { transition: opacity .2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
