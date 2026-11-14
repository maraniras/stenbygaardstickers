<script setup lang="ts">
import { gameDay } from '../../../shared/utils/game-day'
import { adventPresentation } from '../../../shared/utils/advent'
import { previewAdventOpening, adventPrizeIcon } from '../../../shared/utils/advent-rewards'
definePageMeta({
  middleware: () => {
    if (!import.meta.dev && !adventPresentation().open) return navigateTo('/spil')
  },
})
const rewards = useAdventRewards()
const { state: calendar, name, loading, claiming, error, testMode, previewAllowed } = rewards
const claimInFlight = ref(false)
const previewGifts = ref<Record<number, string>>({})
const giftDay = ref<number | null>(null)
function canOpen(day: number) {
  if (testMode.value) return true
  const door = calendar.value?.doors.find((item) => item.day === day)
  return Boolean(door?.opening || (name.value && door?.available && door.configured))
}
function savedOpening(day: number) {
  if (!testMode.value) return calendar.value?.doors.find((item) => item.day === day)?.opening
  const opening = previewAdventOpening(day)
  const to = previewGifts.value[day]
  return to ? { ...opening, gift: { to, deliveredAt: opening.openedAt } } : opening
}
function givePreviewGift(to: string) {
  if (testMode.value && giftDay.value !== null) previewGifts.value[giftDay.value] = to
}
function prizeTitle(day: number) {
  const opening = savedOpening(day)
  if (!opening) return 'En lille overraskelse'
  if (opening.prize.kind === 'bananas' || opening.amount !== 0)
    return `${opening.amount < 0 ? '−' : '+'}${Math.abs(opening.amount).toLocaleString('da-DK')} 🍌`
  return opening.prize.title
}
function prizeDescription(day: number) {
  const prize = savedOpening(day)?.prize
  if (!prize) return ''
  if (testMode.value) return prize.description
  return prize.kind === 'physical'
    ? `${prize.description} ${prize.instructions}`
    : prize.description
}
function restoreSaved() {
  if (testMode.value || claimInFlight.value || phase.value !== 'overview') return
  opened.value = calendar.value?.doors.filter((door) => door.opening).map((door) => door.day) ?? []
  torn.value = [...opened.value]
}
watch([testMode, name], async () => {
  if (await reset()) restoreSaved()
})
watch(calendar, restoreSaved)
const helper = computed(() => {
  if (error.value) return error.value
  if (loading.value && !calendar.value) return 'Henter kalenderen…'
  if (testMode.value) return 'Testvisning · ingen præmier eller ændringer i saldoen'
  if (!calendar.value?.availableDay) return 'Første låge åbner 1. december kl. 04.00 dansk tid'
  if (!name.value) return 'Vælg dit navn for at åbne og gemme dine låger'
  if (!calendar.value.doors.find((door) => door.day === today.value)?.configured)
    return 'Din kalender bliver klar 1. december · tidligere låger kan åbnes senere'
  return 'Nye låger kl. 04.00 · du kan også åbne låger, du har misset'
})
useHead({ title: 'Julekalender · Stenbygaard Stickers' })

// Replace this image when the final calendar background is supplied.
const background = '/images/christmas-calendar-final-v3.webp'
// Early openings stay on scenery, gifts and sleigh; faces are in the later doors.
const days = [8, 15, 3, 21, 17, 23, 11, 19, 22, 16, 2, 7, 20, 18, 13, 4, 24, 10, 14, 6, 12, 1, 9, 5]
const opened = ref<number[]>([])
const torn = ref<number[]>([])
const showFinds = ref(false)
const showPoster = ref(false)
const foundOpenings = computed(() =>
  [...opened.value]
    .sort((a, b) => a - b)
    .flatMap((day) => {
      const opening = savedOpening(day)
      return opening ? [opening] : []
    }),
)
const giftOpenings = computed(() =>
  foundOpenings.value.filter((opening) => opening.prize.kind === 'friend-gift'),
)
const pendingGifts = computed(() =>
  giftOpenings.value.filter((opening) => !opening.gift?.deliveredAt),
)
const giftOpening = computed(() =>
  giftOpenings.value.find((opening) => opening.day === giftDay.value),
)
watch([testMode, name], () => {
  showFinds.value = false
})
const selected = ref<number | null>(null)
const celebration = ref<number | null>(null)
const phase = ref<'overview' | 'zooming' | 'opening' | 'revealed' | 'tearing' | 'returning'>(
  'overview',
)
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
  const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight)
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
  if (!testMode.value && calendar.value) return Math.max(1, calendar.value.availableDay)
  const date = gameDay(currentDate.value)
  return date.slice(5, 7) === '12' ? Math.min(Number(date.slice(-2)), 24) : 1
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
  celebration.value = null
  generation++
  clearTimeout(timer)
  release?.(false)
  release = undefined
  autoplay.value = false
}
async function overview(run = generation) {
  celebration.value = null
  const day = selected.value
  if (day !== null && opened.value.includes(day) && !torn.value.includes(day)) {
    phase.value = 'tearing'
    if (!(await pause(reducedMotion() ? 0 : 550)) || run !== generation) return false
    torn.value = [...torn.value, day]
  }
  phase.value = 'returning'
  transform.value = 'none'
  if (!(await pause(reducedMotion() ? 0 : 850)) || run !== generation) return false
  selected.value = null
  phase.value = 'overview'
  return true
}
async function reveal(day: number, run = generation) {
  const alreadyOpened = opened.value.includes(day)
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
  if (!alreadyOpened) celebration.value = day
  return true
}
async function openDay(day: number) {
  if (busy.value || autoplay.value || claimInFlight.value || loading.value || !canOpen(day)) return
  if (phase.value === 'revealed' && selected.value === day) {
    await overview()
    return
  }
  if (testMode.value) {
    await reveal(day)
    return
  }
  const owner = name.value,
    token = userToken()
  claimInFlight.value = true
  try {
    if (!savedOpening(day) && !(await rewards.claim(day))) return
    if (owner !== name.value || token !== userToken() || testMode.value) return
    if (await reveal(day)) rewards.refreshBalance()
  } finally {
    claimInFlight.value = false
  }
}
async function reset() {
  cancel()
  giftDay.value = null
  previewGifts.value = {}
  opened.value = []
  torn.value = []
  return overview()
}
async function playAll() {
  if (autoplay.value) {
    cancel()
    void overview()
    return
  }
  if (busy.value || !testMode.value || !previewAllowed.value) return
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
      back-to="/spil/jul"
      compact
    >
      <template #actions
        ><button
          v-if="previewAllowed"
          class="preview-tag"
          type="button"
          :aria-pressed="testMode"
          :disabled="busy || claiming || claimInFlight"
          @click="testMode = !testMode"
        >
          {{ testMode ? 'Testvisning' : 'Datolås' }}</button
        ><span
          v-else
          class="preview-tag"
          >1.–24. december</span
        ></template
      >
    </PageHeader>
    <div class="calendar-space">
      <div
        ref="viewport"
        class="calendar-viewport"
        :class="{ focused: selected !== null }"
        :aria-busy="busy"
      >
        <AdventRewardReveal
          v-if="celebration !== null && phase === 'revealed' && savedOpening(celebration)"
          :key="`${testMode}:${celebration}`"
          :opening="savedOpening(celebration)!"
          @finished="celebration = null"
        />
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
            <span>DECEMBER {{ calendar?.year || currentDate.getFullYear() }}</span
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
                tearing: selected === day && phase === 'tearing',
                selected: selected === day,
                double: day === 24,
                today: day === today,
                locked: !testMode && !calendar?.doors.find((door) => door.day === day)?.available,
              }"
              :disabled="busy || autoplay || claiming || claimInFlight || !canOpen(day)"
              :aria-label="
                selected === day && phase === 'revealed'
                  ? `Luk låge ${day} og gå tilbage til kalenderen`
                  : `${opened.includes(day) ? 'Se' : 'Åbn'} låge ${day}`
              "
              :aria-pressed="opened.includes(day)"
              @click="openDay(day)"
            >
              <span
                class="door-inside"
                aria-hidden="true"
                ><span
                  class="door-memory"
                  :style="surfaceStyle(day, 'left')"
                /><img
                  v-if="opened.includes(day)"
                  class="reward-icon"
                  :src="adventPrizeIcon(savedOpening(day)?.prize)"
                  alt=""
                /><span
                  v-if="selected === day"
                  class="door-prize"
                  >{{ prizeTitle(day) }}</span
                ></span
              >
              <template v-if="!torn.includes(day)"
                ><span
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
                  ><span class="door-back" /></span
              ></template>
            </button>
          </div>
        </div>
        <div
          v-if="selected !== null"
          class="door-caption"
          aria-live="polite"
        >
          <span>LÅGE {{ selected }}</span
          ><b>{{
            phase === 'revealed'
              ? savedOpening(selected)?.prize.title || 'Her venter snart en overraskelse'
              : 'Lidt julemagi på vej…'
          }}</b>
          <small v-if="phase === 'revealed' && savedOpening(selected)">{{
            prizeDescription(selected)
          }}</small>
          <small v-if="!testMode && phase === 'revealed' && savedOpening(selected)?.fulfilment">{{
            savedOpening(selected)?.fulfilment === 'delivered'
              ? 'Dine præmier fra denne låge er udleveret.'
              : 'Din præmie er gemt og afventer udlevering.'
          }}</small>
          <div
            v-if="phase === 'revealed' && savedOpening(selected)?.extras?.length"
            class="extra-prizes"
          >
            <span
              v-for="(extra, i) in savedOpening(selected)!.extras"
              :key="i"
            >
              <img
                :src="adventPrizeIcon(extra)"
                alt=""
              />{{ extra.title }}
            </span>
          </div>
          <small v-if="testMode && phase === 'revealed'"
            >Prøvefund · ingen bananer eller rigtige præmier uddeles</small
          >
        </div>
        <span
          v-else
          class="calendar-progress"
          >{{ opened.length }} <span>/ 24 låger åbnet</span></span
        >
      </div>
    </div>
    <AdventFinds
      v-if="showFinds"
      :openings="foundOpenings"
      :preview="testMode"
      @close="showFinds = false"
    />
    <AdventPosterDialog
      v-if="showPoster"
      :src="background"
      :year="calendar?.year ?? 2026"
      @close="showPoster = false"
    />
    <AppDialog
      v-if="giftOpening"
      label="Gave til en ven"
      @close="giftDay = null"
    >
      <section class="gift-dialog">
        <h2>Gave til en ven</h2>
        <label
          v-if="giftOpenings.length > 1"
          class="gift-choice"
        >
          Vælg gave
          <select v-model="giftDay">
            <option
              v-for="opening in giftOpenings"
              :key="opening.day"
              :value="opening.day"
            >
              Låge {{ opening.day
              }}{{ opening.gift?.deliveredAt ? ' · Givet' : ' · Ikke givet endnu' }}
            </option>
          </select>
        </label>
        <p
          v-else
          class="gift-door"
        >
          Låge {{ giftOpening.day }}
        </p>
        <AdventGiftPicker
          :key="`${name}:${giftDay}:${testMode}`"
          :year="calendar?.year ?? currentDate.getFullYear()"
          :preview="testMode"
          :opening="giftOpening"
          @sent="rewards.refresh()"
          @preview-sent="givePreviewGift"
        />
        <button
          class="btn"
          type="button"
          @click="giftDay = null"
        >
          Tilbage til kalenderen
        </button>
      </section>
    </AppDialog>
    <footer class="calendar-controls">
      <div class="calendar-shortcuts">
        <button
          class="finds-button"
          type="button"
          :disabled="busy || autoplay || claimInFlight"
          @click="showFinds = true"
        >
          Mine fund <span>{{ opened.length }}/24</span>
        </button>
        <button
          v-if="pendingGifts.length"
          class="finds-button"
          type="button"
          :disabled="busy || autoplay || claimInFlight"
          @click="giftDay = pendingGifts[0]!.day"
        >
          {{ testMode ? 'Giv testgaven' : 'Giv en gave'
          }}<span v-if="pendingGifts.length > 1">({{ pendingGifts.length }})</span>
        </button>
      </div>
      <button
        class="open-today"
        type="button"
        :disabled="
          busy ||
          autoplay ||
          claiming ||
          claimInFlight ||
          loading ||
          (phase !== 'revealed' && !canOpen(today))
        "
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
      <div
        v-if="testMode && previewAllowed"
        class="test-controls"
      >
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
        {{ autoplay ? `Viser låge ${selected || Math.min(opened.length + 1, 24)} af 24` : helper }}
        <NuxtLink
          v-if="!testMode && !name"
          to="/mig"
          >Vælg navn</NuxtLink
        ><button
          v-if="error"
          class="retry"
          @click="rewards.refresh()"
        >
          Prøv igen
        </button>
      </p>
      <button
        class="poster-link"
        type="button"
        :disabled="busy || autoplay || claimInFlight"
        @click="showPoster = true"
      >
        Se julebilledet
      </button>
      <AdventPrizeShowcase
        v-if="calendar"
        :year="calendar.year"
        :preview="testMode"
        :disabled="busy || autoplay || claimInFlight || showFinds || showPoster || giftDay !== null"
      />
    </footer>
  </div>
</template>

<style scoped>
.poster-link {
  display: block;
  margin: 4px auto 0;
  padding: 5px 12px;
  border: 0;
  background: transparent;
  color: var(--muted);
  font-size: 11px;
  text-decoration: underline;
  text-underline-offset: 3px;
}
.calendar-shortcuts {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
}
.calendar-shortcuts .finds-button {
  flex: 1;
  width: auto;
}
.gift-dialog {
  padding: 22px 20px calc(22px + var(--safe-b));
}
.gift-dialog h2 {
  margin: 0;
  font-size: 22px;
}
.gift-door {
  margin: 8px 0 0;
  color: var(--muted);
  font-size: 12px;
}
.gift-choice {
  display: grid;
  gap: 6px;
  margin-top: 14px;
  font-size: 13px;
}
.gift-choice select {
  width: 100%;
  min-height: 44px;
  padding: 8px 10px;
  border: 1px solid var(--hairline);
  border-radius: 10px;
  background: var(--surface);
  color: var(--text);
  font: inherit;
}
.gift-dialog > button {
  width: 100%;
  margin-top: 8px;
}
.finds-button {
  display: flex;
  justify-content: center;
  gap: 8px;
  width: 100%;
  min-height: 36px;
  border: 0;
  border-radius: 10px;
  background: var(--surface);
  color: var(--text);
  font-weight: 700;
}
.finds-button span {
  color: var(--muted);
  font-weight: 500;
}
.advent-page {
  max-width: 540px;
  height: var(--content-height);
  min-height: 540px;
  margin: 0 auto;
  padding: calc(8px + var(--safe-t)) 14px 8px;
  display: flex;
  flex-direction: column;
}
.preview-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  background: transparent;
  cursor: pointer;
  padding: 5px 8px;
  border: 1px solid var(--hairline);
  border-radius: 8px;
  color: var(--muted);
  font-size: 10px;
}
.calendar-space {
  flex: 1;
  min-height: 0;
  container-type: size;
  display: grid;
  place-items: center;
}
.calendar-viewport {
  position: relative;
  width: min(100cqw, calc(100cqh * 942 / 1670));
  aspect-ratio: 942 / 1670;
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
  object-fit: contain;
  pointer-events: none;
}
.calendar-heading {
  position: relative;
  isolation: isolate;
  display: flex;
  flex-direction: column;
  color: #fff0cb;
  margin-bottom: 16px;
  -webkit-text-stroke: 1.5px #211628;
  paint-order: stroke fill;
  text-shadow:
    0 2px 2px #171124,
    0 0 6px #171124,
    0 0 14px #171124;
  pointer-events: none;
}
.calendar-heading::before {
  content: '';
  position: absolute;
  z-index: -1;
  inset: -10px 16% -10px -10px;
  border-radius: 14px;
  background: radial-gradient(ellipse at left, #171124b3, #17112466 60%, transparent 85%);
  filter: blur(5px);
}
.calendar-heading > span {
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.22em;
  -webkit-text-stroke-width: 0.8px;
}
.calendar-heading b {
  margin-top: 5px;
  font-family: Georgia, serif;
  font-size: clamp(27px, 7vw, 36px);
  font-weight: 700;
  line-height: 1.1;
}
.calendar-heading .calendar-subtitle {
  margin-top: 5px;
  font-family: Georgia, serif;
  font-size: clamp(16px, 4.4vw, 19px);
  font-weight: 700;
  letter-spacing: 0.025em;
  -webkit-text-stroke-width: 1.5px;
}
.doors {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  grid-template-rows: repeat(7, minmax(0, 1fr));
  gap: 15px;
  flex: 1;
  min-height: 0;
}
.doors::before {
  content: '';
  grid-column: 4;
  grid-row: 1;
  pointer-events: none;
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
  color: #fffdf7;
  font-family: Georgia, serif;
  font-size: clamp(22px, 5.7vw, 27px);
  font-weight: 700;
  line-height: 1;
  -webkit-text-stroke: 2.5px #211628;
  paint-order: stroke fill;
  text-shadow:
    0 2px 2px #171124,
    0 0 5px #171124,
    0 0 10px #171124;
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
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 4px;
  background: #211b2b;
  opacity: 0;
  box-shadow: inset 0 0 0 1px #fff0cb33;
}
.door-memory {
  position: absolute;
  inset: 0;
  background-repeat: no-repeat;
  opacity: 0.34;
}
.door-inside .reward-icon {
  position: relative;
  width: 88%;
  height: 76%;
  object-fit: contain;
  color: #ffe0a0;
  filter: drop-shadow(0 1px 2px #211b2b);
}
.extra-prizes {
  display: grid;
  gap: 3px;
  font-size: 11px;
}
.extra-prizes > span {
  display: flex;
  align-items: center;
  gap: 5px;
}
.extra-prizes img {
  width: 30px;
  height: 30px;
  object-fit: contain;
}
.door-prize {
  position: relative;
  color: #fff6df;
  text-shadow:
    0 1px 3px #211b2b,
    0 0 5px #211b2b;
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
.door.tearing .door-hinge {
  animation: tear-left 550ms cubic-bezier(0.3, 0.1, 0.65, 1) both;
}
.door.tearing .door-hinge.right {
  animation-name: tear-right;
}
@keyframes tear-left {
  0% {
    transform: rotateY(-112deg);
    opacity: 1;
  }
  25% {
    transform: translate3d(-5px, -8px, 8px) rotateY(-100deg) rotateZ(-8deg);
    opacity: 1;
  }
  100% {
    transform: translate3d(-65px, 150px, 40px) rotateY(-55deg) rotateZ(-32deg);
    opacity: 0;
  }
}
@keyframes tear-right {
  0% {
    transform: rotateY(112deg);
    opacity: 1;
  }
  25% {
    transform: translate3d(5px, -8px, 8px) rotateY(100deg) rotateZ(8deg);
    opacity: 1;
  }
  100% {
    transform: translate3d(65px, 150px, 40px) rotateY(55deg) rotateZ(32deg);
    opacity: 0;
  }
}
.door.opened {
  z-index: 1;
}
.door.selected {
  z-index: 2;
}
.door.locked .door-face {
  border-color: #fff0cb33;
}
.door.locked .door-face b {
  opacity: 0.5;
}
.door-caption small {
  display: block;
  margin: 6px auto 0;
  max-width: 30em;
  font-size: 11px;
}
.retry {
  border: 0;
  padding: 3px 6px;
  background: none;
  color: inherit;
  text-decoration: underline;
}
.focused .door:not(.selected),
.focused .calendar-heading,
.focused .door:focus-visible {
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
    gap: 11px;
  }
  .calendar-controls {
    padding-top: 8px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .door.tearing .door-hinge {
    animation: none;
  }
  .calendar-scene,
  .door-hinge,
  .door {
    transition: none;
  }
}
</style>
