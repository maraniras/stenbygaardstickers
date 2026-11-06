<script setup lang="ts">
useHead({ title: 'Julekalender · Stenbygaard Stickers' })

// Replace this image when the final calendar background is supplied.
const background = '/images/christmas-calendar-placeholder.svg'
const days = [7, 19, 3, 12, 22, 1, 15, 9, 5, 24, 17, 2, 14, 8, 21, 11, 4, 18, 6, 23, 16, 10, 20, 13]
const opened = ref<number[]>([])
const selected = ref<number | null>(null)
const phase = ref<'overview' | 'zooming' | 'opening' | 'revealed' | 'returning'>('overview')
const autoplay = ref(false)
const viewport = ref<HTMLElement>()
const scene = ref<HTMLElement>()
const transform = ref('none')
const origin = ref('50% 50%')
const backgroundImage = ref<HTMLImageElement>()
const surfaces = ref<Record<number, { x: number; y: number; width: number }>>({})
const artwork = ref({ width: 0, height: 0, x: 0, y: 0 })
let resizeObserver: ResizeObserver | undefined
function measureSurfaces() {
  const element = scene.value,
    image = backgroundImage.value
  if (!element || !image?.naturalWidth || !image.naturalHeight) return
  const width = element.clientWidth,
    height = element.clientHeight
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight)
  const imageWidth = image.naturalWidth * scale,
    imageHeight = image.naturalHeight * scale
  artwork.value = {
    width: imageWidth,
    height: imageHeight,
    x: (width - imageWidth) / 2,
    y: (height - imageHeight) / 2,
  }
  surfaces.value = Object.fromEntries(
    [...element.querySelectorAll<HTMLElement>('[data-day]')].map((door) => [
      Number(door.dataset.day),
      { x: door.offsetLeft, y: door.offsetTop, width: door.offsetWidth },
    ]),
  )
}
function surfaceStyle(day: number, side: string) {
  const cutout = surfaces.value[day]
  if (!cutout) return { backgroundImage: `url('${background}')` }
  return {
    backgroundImage: `url('${background}')`,
    backgroundSize: `${artwork.value.width}px ${artwork.value.height}px`,
    backgroundPosition: `${artwork.value.x - cutout.x - (side === 'right' ? cutout.width / 2 : 0)}px ${artwork.value.y - cutout.y}px`,
  }
}
const currentDate = ref(new Date())
const today = computed(() => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Copenhagen',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(currentDate.value)
  const month = Number(parts.find((p) => p.type === 'month')?.value)
  const day = Number(parts.find((p) => p.type === 'day')?.value)
  return month === 12 ? Math.min(day, 24) : 1
})
const busy = computed(() => phase.value !== 'overview' && phase.value !== 'revealed')
let generation = 0
let timer: ReturnType<typeof setTimeout> | undefined
let release: ((ok: boolean) => void) | undefined
let clock: ReturnType<typeof setInterval> | undefined
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

function pause(ms: number) {
  return new Promise<boolean>((resolve) => {
    release = resolve
    timer = setTimeout(() => {
      release = undefined
      resolve(true)
    }, ms)
  })
}
function cancel() {
  generation++
  clearTimeout(timer)
  release?.(false)
  release = undefined
  autoplay.value = false
}
async function overview(run = generation) {
  phase.value = 'returning'
  transform.value = 'none'
  if (!(await pause(reducedMotion() ? 0 : 850)) || run !== generation) return false
  selected.value = null
  phase.value = 'overview'
  return true
}
async function reveal(day: number, run = generation) {
  if (phase.value !== 'overview' && !(await overview(run))) return false
  if (run !== generation) return false
  phase.value = 'zooming'
  await nextTick()
  if (run !== generation) return false
  const frame = viewport.value?.getBoundingClientRect()
  const door = scene.value
    ?.querySelector<HTMLElement>(`[data-day="${day}"]`)
    ?.getBoundingClientRect()
  if (!frame || !door) {
    phase.value = 'overview'
    return false
  }
  const x = door.left + door.width / 2 - frame.left
  const y = door.top + door.height / 2 - frame.top
  const scale = Math.min(3.3, frame.width / (door.width * 1.35), frame.height / (door.height * 1.7))
  origin.value = `${x}px ${y}px`
  selected.value = day
  transform.value = `translate(${frame.width / 2 - x}px, ${frame.height / 2 - y}px) scale(${scale})`
  if (!(await pause(reducedMotion() ? 0 : 850)) || run !== generation) return false
  phase.value = 'opening'
  if (!opened.value.includes(day)) opened.value = [...opened.value, day]
  if (!(await pause(reducedMotion() ? 0 : 850)) || run !== generation) return false
  phase.value = 'revealed'
  return true
}
function openDay(day: number) {
  if (busy.value || autoplay.value) return
  void reveal(day)
}
async function reset() {
  cancel()
  opened.value = []
  return overview()
}
async function playAll() {
  if (autoplay.value) {
    cancel()
    void overview()
    return
  }
  if (busy.value) return
  if (!(await reset())) return
  autoplay.value = true
  const run = generation
  for (let day = 1; day <= 24; day++) {
    if (!(await reveal(day, run))) return
    if (!(await pause(1100)) || run !== generation) return
    if (!(await overview(run))) return
  }
  autoplay.value = false
}
onMounted(() => {
  resizeObserver = new ResizeObserver(measureSurfaces)
  if (scene.value) resizeObserver.observe(scene.value)
  measureSurfaces()
  clock = setInterval(() => {
    currentDate.value = new Date()
  }, 60000)
})
onBeforeUnmount(() => {
  cancel()
  resizeObserver?.disconnect()
  clearInterval(clock)
})
</script>

<template>
  <div class="advent-page">
    <PageHeader
      title="Julekalender"
      back-to="/spil"
      compact
    >
      <template #actions><span class="preview-tag">Designprøve</span></template>
    </PageHeader>
    <div
      ref="viewport"
      class="calendar-viewport"
      :class="{ focused: selected !== null }"
      :aria-busy="busy"
    >
      <div
        ref="scene"
        class="calendar-scene"
        :style="{ transform, transformOrigin: origin }"
      >
        <img
          ref="backgroundImage"
          class="calendar-background"
          :src="background"
          alt=""
          @load="measureSurfaces"
        />
        <div class="calendar-heading">
          <span>DECEMBER {{ currentDate.getFullYear() }}</span
          ><b>Glædelig jul</b><span class="calendar-subtitle">Og godt Stenbygaard</span>
        </div>
        <div
          class="doors"
          aria-label="Julekalenderens 24 låger"
        >
          <button
            v-for="day in days"
            :key="day"
            :data-day="day"
            type="button"
            class="door"
            :class="{
              opened: opened.includes(day),
              selected: selected === day,
              double: day === 24,
              today: day === today,
            }"
            :disabled="busy || autoplay"
            :aria-label="`${opened.includes(day) ? 'Se' : 'Åbn'} låge ${day}`"
            :aria-pressed="opened.includes(day)"
            @click="openDay(day)"
          >
            <span
              class="door-inside"
              aria-hidden="true"
              ><svg viewBox="0 0 80 80">
                <path
                  d="m40 8 9 21 23 2-18 16 5 23-19-12-19 12 5-23L8 31l23-2Z"
                  fill="currentColor"
                />
                <path
                  d="m40 8 1 31 18 31-5-23 18-16-23-2Z"
                  fill="#fff"
                  opacity=".3"
                /></svg
              ><span>En lille<br />overraskelse</span></span
            >
            <span
              v-for="side in day === 24 ? ['left', 'right'] : ['left']"
              :key="side"
              class="door-hinge"
              :class="side"
              aria-hidden="true"
              ><span
                class="door-face"
                :style="surfaceStyle(day, side)"
                ><b>{{ day === 24 ? (side === 'left' ? '2' : '4') : day }}</b
                ><span class="door-handle" /></span
              ><span class="door-back"
            /></span>
          </button>
        </div>
        <span class="placeholder-label">Midlertidig baggrund</span>
      </div>
      <div
        v-if="selected !== null"
        class="door-caption"
        aria-live="polite"
      >
        <span>LÅGE {{ selected }}</span
        ><b>{{
          phase === 'revealed' ? 'Her venter snart en overraskelse' : 'Lidt julemagi på vej…'
        }}</b>
      </div>
      <span
        v-else
        class="calendar-progress"
        >{{ opened.length }} <span>/ 24 låger åbnet</span></span
      >
    </div>
    <footer class="calendar-controls">
      <button
        class="open-today"
        type="button"
        :disabled="busy || autoplay"
        @click="phase === 'revealed' ? overview() : openDay(today)"
      >
        <span>{{
          phase === 'revealed'
            ? 'Tilbage til kalenderen'
            : opened.includes(today)
              ? 'Se dagens låge'
              : 'Åbn dagens låge'
        }}</span
        ><span aria-hidden="true">{{ phase === 'revealed' ? '↗' : '✦' }}</span>
      </button>
      <div class="test-controls">
        <button
          type="button"
          :disabled="busy && !autoplay"
          @click="playAll"
        >
          {{ autoplay ? 'Stop gennemgang' : 'Afspil alle 24 låger' }}</button
        ><button
          type="button"
          @click="reset"
        >
          Nulstil
        </button>
      </div>
      <p role="status">
        {{
          autoplay
            ? `Viser låge ${selected || Math.min(opened.length + 1, 24)} af 24`
            : 'Prøv lågerne frit · indhold og præmier kommer senere'
        }}
      </p>
    </footer>
  </div>
</template>

<style scoped>
.advent-page {
  max-width: 540px;
  height: calc(100dvh - var(--nav-space));
  min-height: 540px;
  margin: 0 auto;
  padding: calc(8px + var(--safe-t)) 14px 8px;
  display: flex;
  flex-direction: column;
}
.preview-tag {
  padding: 5px 8px;
  border: 1px solid var(--hairline);
  border-radius: 8px;
  color: var(--muted);
  font-size: 10px;
}
.calendar-viewport {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  isolation: isolate;
  border: 1px solid #d0b97d70;
  border-radius: 22px;
  background: #183d36;
  box-shadow: 0 10px 36px #142e2d22;
}
.calendar-scene {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  padding: 18px 18px 45px;
  transition: transform 800ms cubic-bezier(0.22, 0.75, 0.2, 1);
  will-change: transform;
}
.calendar-background {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
}
.calendar-heading {
  position: relative;
  display: flex;
  flex-direction: column;
  color: #fff0cb;
  margin-bottom: 16px;
  text-shadow: 0 2px 10px #102e2b;
  pointer-events: none;
}
.calendar-heading > span {
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.22em;
}
.calendar-heading b {
  margin-top: 5px;
  font-family: Georgia, serif;
  font-size: clamp(27px, 7vw, 36px);
  font-weight: 400;
  line-height: 1.1;
}
.calendar-heading .calendar-subtitle {
  margin-top: 5px;
  font-family: Georgia, serif;
  font-size: 13px;
  font-weight: 400;
  letter-spacing: 0.025em;
}
.doors {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  grid-template-rows: repeat(7, minmax(0, 1fr));
  gap: 9px;
  flex: 1;
  min-height: 0;
}
.door {
  position: relative;
  min-width: 0;
  min-height: 0;
  padding: 0;
  border: 0;
  border-radius: 5px;
  background: transparent;
  perspective: 500px;
  cursor: pointer;
  transition: opacity 500ms;
}
.door.double {
  grid-column: 2 / span 2;
  grid-row: 5 / span 2;
}
.door.double .door-hinge {
  width: 50%;
}
.door.double .door-hinge.right {
  left: 50%;
  transform-origin: right center;
}
.door-hinge {
  position: absolute;
  inset: 0;
  transform-origin: left center;
  transform-style: preserve-3d;
  transition: transform 800ms cubic-bezier(0.25, 0.65, 0.2, 1);
}
.door-back {
  position: absolute;
  inset: 0;
  border: 1px solid #d2b473;
  border-radius: 5px;
  background: repeating-linear-gradient(45deg, #e1c78c, #e1c78c 5px, #dcc086 5px, #dcc086 6px);
  transform: rotateY(180deg);
  backface-visibility: hidden;
}
.door-face {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: flex-end;
  padding: 5px 6px;
  border: 1px dashed #fff0cb66;
  border-radius: 3px;
  backface-visibility: hidden;
  background-repeat: no-repeat;
  background-origin: border-box;
}
.door-face b {
  color: #fff6df;
  font-family: Georgia, serif;
  font-size: clamp(19px, 5vw, 25px);
  font-weight: 400;
  line-height: 1;
  text-shadow:
    0 1px 3px #102e2b,
    0 0 7px #102e2bcc;
}
.double .left .door-face {
  justify-content: flex-end;
  padding-right: 1px;
  border-right: 1px solid #fff0cb44;
  border-radius: 3px 0 0 3px;
}
.double .right .door-face {
  padding-left: 1px;
  border-left: 0;
  border-radius: 0 3px 3px 0;
}
.double .door-face {
  align-items: center;
}
.double .door-handle {
  top: 65%;
}
.double .door-face b {
  font-size: 36px;
}
.door-handle {
  position: absolute;
  top: 50%;
  right: 4px;
  width: 2px;
  height: 6px;
  border-radius: 4px;
  background: #fff5da66;
}
.double .right .door-handle {
  right: auto;
  left: 4px;
}
.door-inside {
  position: absolute;
  inset: 1px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 4px;
  background: radial-gradient(ellipse at top, #fff7db, #d2b887);
  opacity: 0;
  box-shadow: inset 2px 3px 10px #48341444;
}
.door-inside svg {
  width: 37%;
  height: 44%;
  color: #c79037;
}
.door-inside > span {
  color: #694b2a;
  font-size: 6px;
  line-height: 1.2;
  margin-top: 2px;
}
.door.opened .door-inside {
  opacity: 1;
}
.door.opened.double .door-hinge.right {
  transform: rotateY(112deg);
}
.door.opened .door-hinge {
  transform: rotateY(-112deg);
}
.door.opened {
  z-index: 1;
}
.door.selected {
  z-index: 2;
}
.focused .door:not(.selected),
.focused .calendar-heading,
.focused .placeholder-label {
  opacity: 0.2;
}
.door:focus-visible {
  outline: 3px solid #ffe4a0;
  outline-offset: 3px;
  z-index: 3;
}
.placeholder-label {
  position: absolute;
  right: 14px;
  bottom: 14px;
  font-size: 8px;
  color: #f7f0d8;
  text-shadow: 0 1px 4px #17332d;
}
.calendar-progress {
  position: absolute;
  left: 14px;
  bottom: 12px;
  color: #fff5d8;
  font-size: 12px;
  font-weight: 800;
  text-shadow: 0 1px 4px #17332d;
}
.calendar-progress span {
  font-size: 9px;
  font-weight: 500;
}
.door-caption {
  position: absolute;
  inset: auto 0 0;
  padding: 32px 12px 22px;
  text-align: center;
  color: #fff0cc;
  background: linear-gradient(transparent, #102d2de8);
  pointer-events: none;
}
.door-caption span {
  display: block;
  font-size: 9px;
  letter-spacing: 0.2em;
  margin-bottom: 6px;
}
.door-caption b {
  font-family: Georgia, serif;
  font-size: 19px;
  font-weight: 400;
}
.calendar-controls {
  flex: none;
  padding-top: 12px;
}
.open-today {
  width: 100%;
  min-height: 48px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 17px;
  border: 1px solid #e8cc89;
  border-radius: 14px;
  background: linear-gradient(115deg, #f7e4ad, #d9b66b);
  color: #4c3720;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 3px 10px #70542118;
}
.open-today > span:last-child {
  font-size: 22px;
  line-height: 1;
}
.test-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.test-controls button {
  min-height: 40px;
  padding: 4px 2px;
  border: 0;
  background: transparent;
  color: var(--muted);
  font-size: 11px;
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
}
.calendar-controls p {
  margin: 0;
  color: var(--muted);
  text-align: center;
  font-size: 9px;
}
button:disabled {
  cursor: default;
}
.calendar-controls button:disabled {
  opacity: 0.55;
}
.calendar-controls button:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
}
@media (max-height: 740px) {
  .calendar-scene {
    padding: 12px 14px 34px;
  }
  .calendar-heading {
    margin-bottom: 9px;
  }
  .calendar-heading b {
    font-size: 27px;
  }
  .doors {
    gap: 6px;
  }
  .calendar-controls {
    padding-top: 8px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .calendar-scene,
  .door-hinge,
  .door {
    transition: none;
  }
}
</style>
