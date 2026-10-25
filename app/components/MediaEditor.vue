<script setup lang="ts">
// Billeder og videoer til en sticker. Det første er forsidebillede (thumbnail).
const model = defineModel<StickerMedia[]>({ required: true })
const busy = defineModel<boolean>('busy', { default: false })
/** Datoen fra det første billede, der har en (EXIF) */
const emit = defineEmits<{ photoDate: [date: string] }>()

interface Job { id: number, name: string, video: boolean, pct: number, error?: string }
const jobs = ref<Job[]>([])
const fileInput = ref<HTMLInputElement>()
let nextId = 0

watch(jobs, list => { busy.value = list.some(j => !j.error) }, { deep: true })

async function onFiles(e: Event) {
  const files = [...((e.target as HTMLInputElement).files ?? [])]
  ;(e.target as HTMLInputElement).value = ''
  const batch = files.map((file) => {
    const job = reactive<Job>({ id: nextId++, name: file.name, video: file.type.startsWith('video/'), pct: 0 })
    jobs.value.push(job)
    return job
  })
  // Én ad gangen, så rækkefølgen bliver som valgt
  for (const [i, file] of files.entries()) {
    const job = batch[i]!
    const date = await photoDate(file)
    if (date) emit('photoDate', date)
    try {
      const m = await uploadMedia(file, (pct) => { job.pct = pct })
      model.value = [...model.value, m]
      jobs.value = jobs.value.filter(j => j !== job)
    }
    catch (err) {
      job.error = err instanceof Error ? err.message : 'Upload fejlede'
    }
  }
}

function remove(i: number) {
  model.value = model.value.filter((_, j) => j !== i)
}

function makeCover(i: number) {
  const list = [...model.value]
  const [m] = list.splice(i, 1)
  model.value = [m!, ...list]
}

function dismiss(job: Job) {
  jobs.value = jobs.value.filter(j => j !== job)
}
</script>

<template>
  <div class="media">
    <div v-for="(m, i) in model" :key="m.src" class="tile">
      <img v-if="m.type === 'image' || m.poster" :src="m.type === 'image' ? m.src : m.poster" alt="">
      <video v-else :src="m.src" muted playsinline preload="metadata" />
      <span v-if="m.type === 'video'" class="badge">Video</span>
      <span v-if="i === 0" class="badge cover">Forside</span>
      <button v-else type="button" class="star" aria-label="Brug som forside" title="Brug som forside" @click="makeCover(i)">
        <svg viewBox="0 0 24 24"><path d="m12 3 2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.8l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8Z" /></svg>
      </button>
      <button type="button" class="x" aria-label="Fjern" @click="remove(i)">
        <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18" /></svg>
      </button>
    </div>

    <div v-for="j in jobs" :key="j.id" class="tile job" :class="{ failed: j.error }">
      <template v-if="j.error">
        <span class="msg">{{ j.error }}</span>
        <button type="button" class="x" aria-label="Luk" @click="dismiss(j)">
          <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18" /></svg>
        </button>
      </template>
      <template v-else>
        <span class="msg">{{ j.video ? 'Video' : 'Billede' }}<br>{{ j.pct ? `${Math.round(j.pct)} %` : 'Klargør…' }}</span>
        <span class="bar" :style="{ width: `${j.pct}%` }" />
      </template>
    </div>

    <button type="button" class="tile add" @click="fileInput?.click()">
      <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg>
      Billeder / video
    </button>
    <input ref="fileInput" type="file" accept="image/*,video/*" multiple hidden @change="onFiles">
  </div>
</template>

<style scoped>
.media {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 8px;
}
.tile {
  position: relative;
  aspect-ratio: 3 / 4;
  border-radius: 14px;
  overflow: hidden;
  background: var(--surface-2);
}
.tile img, .tile video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.badge {
  position: absolute;
  left: 6px;
  bottom: 6px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(0, 0, 0, .55);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
}
.badge.cover {
  left: auto;
  right: 6px;
  background: var(--accent);
  color: var(--on-accent);
}
.x, .star {
  position: absolute;
  top: 6px;
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: rgba(0, 0, 0, .55);
  color: #fff;
  cursor: pointer;
}
.x { right: 6px; }
.star { left: 6px; }
.x svg, .star svg { width: 14px; height: 14px; fill: none; stroke: currentColor; stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; }
.job {
  display: grid;
  place-items: center;
  padding: 8px;
  text-align: center;
}
.msg { font-size: 13px; font-weight: 700; color: var(--muted); }
.failed { background: #fdecea; }
.failed .msg { color: #c62828; }
.bar {
  position: absolute;
  left: 0;
  bottom: 0;
  height: 4px;
  background: var(--ink);
  transition: width .2s;
}
.add {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 2px dashed rgba(17, 17, 20, .15);
  background: none;
  font-size: 13px;
  font-weight: 700;
  color: var(--muted);
  cursor: pointer;
}
.add svg { width: 26px; height: 26px; fill: none; stroke: currentColor; stroke-width: 2.2; stroke-linecap: round; }
</style>
