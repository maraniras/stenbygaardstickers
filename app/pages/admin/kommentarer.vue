<script setup lang="ts">
// Admin: alle kommentarer på tværs af stickers, nyeste først. Slet herfra
// (sletter man en kommentar, forsvinder svarene under den også).
interface AdminComment extends CommentData {
  stickerTitle: string
  likes: number
}

const { admin, check } = useAdmin()
const comments = ref<AdminComment[]>()
const error = ref('')
const query = ref('')
const confirm = ref('')
const now = ref(Date.now())

useHead({ title: 'Kommentarer · Admin' })

async function load() {
  try {
    comments.value = await $fetch<AdminComment[]>('/api/admin/comments')
    now.value = Date.now()
  } catch (err: any) {
    error.value = err?.data?.statusMessage || 'Kunne ikke hente kommentarer'
  }
}

onMounted(async () => {
  if (await check()) await load()
})

const shown = computed(() => {
  const q = query.value.trim().toLocaleLowerCase('da')
  if (!q) return comments.value ?? []
  return (comments.value ?? []).filter((c) =>
    [c.text, c.author, c.stickerTitle].some((t) => t.toLocaleLowerCase('da').includes(q)),
  )
})

async function remove(c: AdminComment) {
  error.value = ''
  try {
    await $fetch<{ ok: boolean }>(`/api/comments/${c.id}` as string, {
      method: 'DELETE',
      query: { sticker: c.stickerId },
    })
    confirm.value = ''
    await load()
    useCommentCounts().reload()
    useCommentStats().reload()
  } catch (err: any) {
    error.value = err?.data?.statusMessage || 'Kunne ikke slette'
  }
}
</script>

<template>
  <div class="page">
    <NuxtLink
      class="back-link"
      to="/admin"
      >‹ Admin</NuxtLink
    >
    <h1>Kommentarer</h1>

    <p
      v-if="admin === false"
      class="empty"
    >
      Log ind på <NuxtLink to="/admin">Admin</NuxtLink> først.
    </p>

    <template v-else-if="comments">
      <input
        v-model="query"
        class="search"
        type="search"
        placeholder="Søg i tekst, navn eller sticker"
      />
      <p class="count">{{ shown.length }} {{ shown.length === 1 ? 'kommentar' : 'kommentarer' }}</p>
      <p
        v-if="error"
        class="err"
      >
        {{ error }}
      </p>

      <ul class="list">
        <li
          v-for="c in shown"
          :key="c.id"
          :class="{ reply: c.parentId }"
        >
          <div class="top">
            <UserAvatar
              class="avatar"
              :name="c.author"
            />
            <div class="who">
              <b>{{ c.author }}</b>
              <span
                >{{ timeAgo(c.createdAt, now) }}<template v-if="c.parentId"> · svar</template
                ><template v-if="c.editedAt"> · redigeret</template
                ><template v-if="c.likes"> · 👍 {{ c.likes }}</template></span
              >
            </div>
          </div>
          <p class="text">{{ c.text }}</p>
          <div class="actions">
            <NuxtLink
              class="sticker"
              :to="{ path: `/sticker/${c.stickerId}`, query: { comment: c.id } }"
              >På »{{ c.stickerTitle }}« ›</NuxtLink
            >
            <button
              v-if="confirm !== c.id"
              class="chip"
              @click="confirm = c.id"
            >
              Slet
            </button>
            <span
              v-else
              class="confirm"
            >
              <button
                class="chip danger"
                @click="remove(c)"
              >
                {{ c.parentId ? 'Ja, slet' : 'Ja, slet (og svar)' }}
              </button>
              <button
                class="chip"
                @click="confirm = ''"
              >
                Fortryd
              </button>
            </span>
          </div>
        </li>
      </ul>
      <p
        v-if="!shown.length"
        class="empty"
      >
        {{ query ? 'Ingen kommentarer matcher.' : 'Ingen kommentarer endnu.' }}
      </p>
    </template>

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
  padding: calc(20px + var(--safe-t)) 16px var(--nav-space);
}
.back-link {
  font-size: 14px;
  font-weight: 700;
  color: var(--muted);
  text-decoration: none;
}
h1 {
  font-size: 30px;
  margin: 6px 0 14px;
}
.search {
  width: 100%;
  height: 44px;
  padding: 0 14px;
  border: 1px solid var(--hairline);
  border-radius: 14px;
  background: var(--surface);
  box-shadow: var(--shadow-sm);
  font-size: 16px;
  outline: none;
}
.count {
  margin: 10px 2px 6px;
  font-size: 13px;
  color: var(--muted);
}
.list {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.list li {
  padding: 12px 14px;
  border-radius: 18px;
  background: var(--surface);
  box-shadow: var(--shadow-sm);
}
.list li.reply {
  margin-left: 24px;
}
.top {
  display: flex;
  align-items: center;
  gap: 10px;
}
.avatar {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: var(--accent);
  color: var(--on-accent);
  font-size: 13px;
  font-weight: 800;
}
.who {
  display: flex;
  flex-direction: column;
}
.who b {
  font-size: 14px;
}
.who span {
  font-size: 12px;
  color: var(--muted);
}
.text {
  margin: 8px 0;
  font-size: 15px;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.sticker {
  font-size: 13px;
  font-weight: 700;
  color: var(--muted);
  text-decoration: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.confirm {
  display: flex;
  gap: 6px;
}
.danger {
  background: #fdecea;
  color: #c62828;
}
.err {
  margin: 0 0 8px;
  color: #c62828;
  font-weight: 600;
}
.empty {
  color: var(--muted);
}
</style>
