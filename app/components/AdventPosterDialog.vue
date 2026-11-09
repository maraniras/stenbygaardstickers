<script setup lang="ts">
const props = defineProps<{ src: string; year: number }>()
const emit = defineEmits<{ close: [] }>()
const poster = ref(''),
  loading = ref(true),
  error = ref('')
let generation = 0
async function createPoster() {
  const run = ++generation
  loading.value = true
  error.value = ''
  try {
    const image = new Image()
    image.src = props.src
    await image.decode()
    await document.fonts.ready
    if (run !== generation) return
    const canvas = document.createElement('canvas')
    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) throw Error('Canvas unavailable')
    ctx.drawImage(image, 0, 0)
    ctx.scale(canvas.width / 942, canvas.width / 942)
    const shade = ctx.createLinearGradient(0, 0, 0, 270)
    shade.addColorStop(0, '#12182788')
    shade.addColorStop(1, '#12182700')
    ctx.fillStyle = shade
    ctx.fillRect(0, 0, 942, 270)
    ctx.fillStyle = '#fff0cb'
    ctx.strokeStyle = '#211628'
    ctx.lineJoin = 'round'
    ctx.shadowColor = '#171124'
    ctx.shadowBlur = 10
    ctx.shadowOffsetY = 3
    const text = (label: string, font: string, y: number, stroke: number) => {
      ctx.font = font
      ctx.lineWidth = stroke
      ctx.strokeText(label, 52, y)
      ctx.fillText(label, 52, y)
    }
    text(`DECEMBER ${props.year}`, 'bold 24px system-ui, sans-serif', 66, 3)
    text('Glædelig jul', 'bold 76px Georgia, serif', 145, 6)
    text('Og godt Stenbygaard', 'bold 50px Georgia, serif', 210, 5)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
    if (run !== generation) return
    if (!blob) throw Error('Image export failed')
    if (poster.value) URL.revokeObjectURL(poster.value)
    poster.value = URL.createObjectURL(blob)
  } catch {
    if (run === generation) error.value = 'Billedet kunne ikke klargøres. Prøv igen.'
  } finally {
    if (run === generation) loading.value = false
  }
}
onMounted(createPoster)
onBeforeUnmount(() => {
  generation++
  if (poster.value) URL.revokeObjectURL(poster.value)
})
</script>
<template>
  <AppDialog
    label="Julebilledet"
    @close="emit('close')"
  >
    <section class="poster-dialog">
      <header>
        <h2>Julebilledet</h2>
        <button
          type="button"
          aria-label="Luk julebilledet"
          @click="emit('close')"
        >
          ✕
        </button>
      </header>
      <img
        v-if="poster"
        class="poster-image"
        :src="poster"
        :alt="`Glædelig jul og godt Stenbygaard · December ${year}`"
      />
      <p
        v-else-if="loading"
        class="poster-message"
        role="status"
      >
        Klargør julebilledet…
      </p>
      <p
        v-if="error"
        class="poster-message"
        role="alert"
      >
        {{ error }}
        <button
          type="button"
          @click="createPoster"
        >
          Prøv igen
        </button>
      </p>
      <footer>
        <a
          v-if="poster"
          class="btn"
          :href="poster"
          :download="`stenbygaard-jul-${year}.png`"
          >Hent billede</a
        >
        <button
          v-else
          class="btn"
          type="button"
          disabled
        >
          Hent billede
        </button>
      </footer>
    </section>
  </AppDialog>
</template>
<style scoped>
header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px 6px 18px;
}
h2 {
  margin: 0;
  font-size: 17px;
}
header button {
  width: 40px;
  min-height: 40px;
  border: 0;
  background: transparent;
  color: var(--text);
  font-size: 20px;
}
.poster-image {
  display: block;
  width: 100%;
  max-height: calc(100dvh - 160px - var(--safe-b));
  object-fit: contain;
  background: #121827;
}
.poster-message {
  min-height: 180px;
  display: grid;
  place-content: center;
  gap: 12px;
  padding: 24px;
  text-align: center;
  color: var(--muted);
}
footer {
  padding: 12px 16px calc(14px + var(--safe-b));
}
.btn {
  width: 100%;
  text-decoration: none;
}
</style>
