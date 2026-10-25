<script setup lang="ts">
// Automatiske backups (dagligt kl. 03 UTC via Vercel Cron) + manuel backup og download
interface BackupFile { name: string, url?: string, size: number, createdAt: string }

const files = ref<BackupFile[]>()
const working = ref(false)
const error = ref('')

async function load() {
  try { files.value = await $fetch<BackupFile[]>('/api/admin/backups') }
  catch { error.value = 'Kunne ikke hente backups' }
}

async function backupNow() {
  working.value = true
  error.value = ''
  try {
    await $fetch('/api/admin/backups', { method: 'POST' })
    await load()
  }
  catch (err: any) {
    error.value = err?.data?.statusMessage || 'Backup fejlede'
  }
  finally {
    working.value = false
  }
}

const when = (iso: string) => new Date(iso).toLocaleString('da-DK', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
const kb = (n: number) => `${Math.max(1, Math.round(n / 1024)).toLocaleString('da-DK')} kB`

onMounted(load)
</script>

<template>
  <section class="backups">
    <h2 class="eyebrow">Backup</h2>
    <p class="hint-text">Der tages automatisk en backup hver nat. De seneste 30 gemmes.</p>
    <div class="buttons">
      <button class="btn secondary" :disabled="working" @click="backupNow">{{ working ? 'Tager backup…' : 'Tag backup nu' }}</button>
      <a class="btn secondary" href="/api/admin/backup.json" download>Download</a>
    </div>
    <p v-if="error" class="err">{{ error }}</p>
    <ul v-if="files?.length" class="list">
      <li v-for="f in files.slice(0, 7)" :key="f.name">
        <component :is="f.url ? 'a' : 'span'" :href="f.url" target="_blank" rel="noopener">{{ when(f.createdAt) }}</component>
        <span class="size">{{ kb(f.size) }}</span>
      </li>
    </ul>
    <p v-else-if="files" class="hint-text">Ingen backups endnu.</p>
  </section>
</template>

<style scoped>
.backups {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 40px;
  padding-top: 20px;
  border-top: 1px solid var(--hairline);
}
.hint-text { margin: 0; font-size: 13px; color: var(--muted); }
.buttons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.buttons .btn { min-height: 44px; font-size: 15px; }
.err { margin: 0; color: #c62828; font-weight: 600; }
.list {
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 14px;
}
.list li {
  display: flex;
  justify-content: space-between;
  padding: 8px 2px;
  border-bottom: 1px solid var(--hairline);
}
.size { color: var(--muted); font-variant-numeric: tabular-nums; }
</style>
