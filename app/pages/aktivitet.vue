<script setup lang="ts">
import { NOTIFY_TYPES } from '../../shared/utils/notify'
import type { ActivityItem } from '../../shared/types/activity'
useHead({ title: 'Din aktivitet · Stenbygaard Stickers' })
const { name, ready } = useUser()
const { items, unread, loading, error, reload, markRead } = useActivity()
onMounted(reload)
const time = (at: string) =>
  new Date(at).toLocaleString('da-DK', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Copenhagen',
  })
const icon = (item: ActivityItem) => NOTIFY_TYPES.find((t) => t.type === item.type)?.emoji ?? '🔔'
async function open(item: ActivityItem) {
  if (!item.readAt) await markRead([item.id])
  await navigateTo(item.url)
}
</script>
<template>
  <div class="activity-page">
    <PageHeader
      title="Din aktivitet"
      :back-to="name ? personUrl(name) : '/mig'"
      :back-label="name ? 'Min profil' : 'Mig'"
    >
      <template #actions
        ><NuxtLink
          class="page-icon-button"
          to="/notifikationer"
          aria-label="Notifikationsindstillinger"
          ><svg
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M4 7h16M4 17h16M8 4v6m8 4v6" /></svg></NuxtLink
      ></template>
    </PageHeader>
    <p v-if="ready && !name">
      Vælg dit navn for at få en personlig indbakke. <NuxtLink to="/mig">Vælg navn →</NuxtLink>
    </p>
    <template v-else-if="name">
      <div class="activity-heading">
        <span>{{ unread }} ulæste</span
        ><button
          v-if="unread"
          class="text-button"
          :disabled="loading"
          @click="markRead(items.filter((i) => !i.readAt).map((i) => i.id))"
        >
          Markér alle som læst
        </button>
      </div>
      <p
        v-if="error"
        role="alert"
      >
        {{ error }}
        <button
          class="text-button"
          @click="reload"
        >
          Prøv igen
        </button>
      </p>
      <p
        v-if="loading && !items.length"
        role="status"
      >
        Henter aktivitet…
      </p>
      <div
        v-else-if="!items.length && !error"
        class="empty"
      >
        <b>Her samler vi dine beskeder</b>
        <p>
          Fremover kan du finde tags, svar, badges, gaver og anden personlig aktivitet her — også
          uden push.
        </p>
      </div>
      <ol
        v-else
        class="activities"
      >
        <li
          v-for="item in items"
          :key="item.id"
        >
          <button
            class="item"
            :class="{ unread: !item.readAt }"
            @click="open(item)"
          >
            <span
              class="icon"
              aria-hidden="true"
              >{{ icon(item) }}</span
            ><span class="copy"
              ><b>{{ item.title }}</b
              ><span>{{ item.body }}</span
              ><time :datetime="item.createdAt"
                >{{ time(item.createdAt) }}{{ !item.readAt ? ' · Ulæst' : '' }}</time
              ></span
            ><span aria-hidden="true">›</span>
          </button>
        </li>
      </ol>
      <p class="hint">
        Dine seneste 100 beskeder gemmes. Pushindstillinger ændrer ikke din indbakke.
      </p>
    </template>
  </div>
</template>
<style scoped>
.activity-page {
  max-width: 640px;
  margin: auto;
  padding: calc(20px + var(--safe-t)) 16px 24px;
}
.activity-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: var(--muted);
  font-size: 12px;
  margin-bottom: 12px;
}
.text-button {
  min-height: 44px;
  border: 0;
  background: none;
  color: var(--text);
  font: inherit;
  text-decoration: underline;
  cursor: pointer;
}
.activities {
  padding: 0;
  list-style: none;
  display: grid;
  gap: 8px;
}
.item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 16px;
  border: 1px solid var(--hairline);
  border-radius: 18px;
  background: var(--surface);
  color: var(--text);
  text-align: left;
  cursor: pointer;
  font: inherit;
}
.item.unread {
  border-color: var(--accent);
  background: var(--accent-soft);
}
.copy {
  flex: 1;
  display: grid;
  gap: 5px;
  min-width: 0;
  overflow-wrap: anywhere;
}
.copy b {
  font-size: 14px;
}
.copy span {
  font-size: 12px;
  color: var(--muted);
}
time,
.hint {
  font-size: 11px;
  color: var(--muted);
}
.icon {
  font-size: 24px;
}
.empty {
  padding: 24px 18px;
  background: var(--surface);
  border-radius: 20px;
}
.empty p {
  color: var(--muted);
  font-size: 14px;
}
.item:focus-visible,
.text-button:focus-visible {
  outline: 2px solid var(--text);
  outline-offset: 3px;
}
</style>
