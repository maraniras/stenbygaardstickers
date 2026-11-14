<script setup lang="ts">
import type { CrosswordHelp, CrosswordView } from '../../shared/types/crossword'
const props = defineProps<{
  puzzle: NonNullable<CrosswordView['puzzle']>
  puzzleId: string
  owner: string
  preview: boolean
  checkAnswers?: (answers: Record<string, string>) => Promise<{ correct: boolean }>
  readOnly?: boolean
  solution?: Record<string, string>
  title?: string
  backTo?: string
  helpAt?: string | null
  helpAvailable?: boolean
  completed?: boolean
  checkHelp?: (answers: Record<string, string>) => Promise<CrosswordHelp>
}>()
const entries = props.puzzle.entries
const columns = props.puzzle.columns
const rows = props.puzzle.rows
const imageEntries = entries.flatMap((entry, index) =>
  entry.image ? [{ index, ...entry.image }] : [],
)
const imageOpen = ref<number | null>(null)
const openedImage = computed(() => (imageOpen.value === null ? null : entries[imageOpen.value]))
function openImageClue(index: number) {
  chooseWord(index)
  imageOpen.value = index
}
function imageArrowStyle(index: number) {
  const entry = entries[index]!
  const image = entry.image
  if (!image || image.width === 1) return
  const size = { width: `${100 / image.width}%`, height: `${100 / image.height}%` }
  return entry.down
    ? { ...size, left: `${((entry.col - image.col) / image.width) * 100}%` }
    : { ...size, top: `${((entry.row - image.row) / image.height) * 100}%` }
}
const key = (row: number, col: number) => `${row}:${col}`
const wordCells = entries.map((entry) =>
  Array.from({ length: entry.length }, (_, index) => ({
    key: key(entry.row + (entry.down ? index : 0), entry.col + (entry.down ? 0 : index)),
  })),
)
const answerCells = Object.fromEntries(wordCells.flat().map((cell) => [cell.key, true]))
const clueCells = new Map(
  entries.flatMap((entry, index) =>
    entry.image
      ? []
      : [[key(entry.row - (entry.down ? 1 : 0), entry.col - (entry.down ? 0 : 1)), index]],
  ),
)
const cells = Array.from({ length: columns * rows }, (_, index) => {
  const row = Math.floor(index / columns)
  const col = index % columns
  return {
    key: key(row, col),
    row,
    col,
    clue: clueCells.get(key(row, col)),
  }
}).filter(
  (cell) =>
    !imageEntries.some(
      (image) =>
        cell.row >= image.row &&
        cell.row < image.row + image.height &&
        cell.col >= image.col &&
        cell.col < image.col + image.width,
    ),
)
const letters = ref<Record<string, string>>({})
const selected = ref(0)
const cursor = ref(wordCells[0]![0]!.key)
const board = ref<HTMLElement>()
const boardViewport = ref<HTMLElement>()
const zoom = ref(1)
const zoomed = computed(() => zoom.value > 1)
const dragging = ref(false)
let pan: { id: number; x: number; y: number; left: number; top: number } | undefined
let suppressClick = false
function startPan(event: PointerEvent) {
  suppressClick = false
  if (!zoomed.value || event.pointerType !== 'mouse' || event.button !== 0) return
  const viewport = boardViewport.value
  if (!viewport) return
  pan = {
    id: event.pointerId,
    x: event.clientX,
    y: event.clientY,
    left: viewport.scrollLeft,
    top: viewport.scrollTop,
  }
}
function movePan(event: PointerEvent) {
  const viewport = boardViewport.value
  if (!pan || pan.id !== event.pointerId || !viewport) return
  const dx = event.clientX - pan.x
  const dy = event.clientY - pan.y
  if (!dragging.value && Math.hypot(dx, dy) < 5) return
  if (!dragging.value) viewport.setPointerCapture(event.pointerId)
  dragging.value = true
  suppressClick = true
  event.preventDefault()
  viewport.scrollLeft = pan.left - dx
  viewport.scrollTop = pan.top - dy
}
function endPan(event: PointerEvent) {
  if (!pan || pan.id !== event.pointerId) return
  pan = undefined
  dragging.value = false
  const viewport = boardViewport.value
  if (viewport?.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId)
  if (event.type === 'pointercancel') suppressClick = false
}
function onBoardClick(event: MouseEvent) {
  if (!suppressClick) return
  event.preventDefault()
  event.stopPropagation()
  suppressClick = false
}
async function setZoom(value: number) {
  zoom.value = Math.max(1, Math.min(3, Math.round(value)))
  await nextTick()
  const viewport = boardViewport.value
  const active = board.value?.querySelector<HTMLElement>('.letter-cell[aria-pressed="true"]')
  if (!viewport) return
  if (zoom.value === 1 || !active) {
    viewport.scrollTo({ left: 0, top: 0 })
    return
  }
  const cell = active.getBoundingClientRect()
  const frame = viewport.getBoundingClientRect()
  viewport.scrollTo({
    left: viewport.scrollLeft + cell.left - frame.left - (frame.width - cell.width) / 2,
    top: viewport.scrollTop + cell.top - frame.top - (frame.height - cell.height) / 2,
  })
}
const loaded = ref(false)
const dailyHelp = ref<CrosswordHelp | null>(null)
const helpError = ref(false)
let progressTimer: ReturnType<typeof setTimeout> | undefined
let progressClock: ReturnType<typeof setInterval> | undefined
let syncingProgress = false
let syncAgain = false
let stopped = false
const firstHelpTime = computed(() =>
  props.helpAt
    ? new Date(props.helpAt).toLocaleString('da-DK', {
        timeZone: 'Europe/Copenhagen',
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '',
)
function correctCell(cell: string) {
  return (
    !props.readOnly &&
    dailyHelp.value?.available &&
    !!letters.value[cell] &&
    dailyHelp.value.correctLetters[cell] === letters.value[cell]
  )
}
function scheduleProgress(delay = 650) {
  if (
    stopped ||
    props.readOnly ||
    props.preview ||
    props.completed ||
    !props.checkHelp ||
    !loaded.value
  )
    return
  clearTimeout(progressTimer)
  progressTimer = setTimeout(() => void syncProgress(), delay)
}
async function syncProgress() {
  if (stopped || props.readOnly || props.preview || props.completed || !props.checkHelp) return
  if (syncingProgress) {
    syncAgain = true
    return
  }
  syncingProgress = true
  helpError.value = false
  try {
    const response = await props.checkHelp({ ...letters.value })
    if (!stopped) dailyHelp.value = response
  } catch {
    if (!stopped) helpError.value = true
  } finally {
    syncingProgress = false
    if (syncAgain && !stopped) {
      syncAgain = false
      scheduleProgress(0)
    }
  }
}
function resumeProgress() {
  if (!document.hidden) scheduleProgress(0)
}
watch([letters, loaded, () => props.helpAvailable], () => scheduleProgress(), { deep: true })
const saveError = ref(false)
const activeEntry = computed(() => entries[selected.value]!)
const activeCells = computed(() => wordCells[selected.value]!)
const count = computed(() => Object.keys(answerCells).filter((cell) => letters.value[cell]).length)
const total = Object.keys(answerCells).length
const result = ref('')
const checking = ref(false)
const retryable = ref(false)
let checkTimer: ReturnType<typeof setTimeout> | undefined
let checkRevision = 0
const storageKey =
  'stenbygaard-crossword:' +
  props.puzzleId +
  ':' +
  props.puzzle.revision +
  ':' +
  props.owner +
  (props.preview ? ':preview' : '')
async function checkWholePuzzle() {
  if (props.readOnly || !props.checkAnswers || count.value !== total || checking.value) return
  const revision = ++checkRevision
  checking.value = true
  retryable.value = false
  try {
    const response = await props.checkAnswers({ ...letters.value })
    if (revision !== checkRevision) return
    result.value = response.correct
      ? props.preview
        ? 'Hele krydsordet er korrekt. Preview giver ingen præmie.'
        : 'Hele krydsordet er korrekt!'
      : 'Der er stadig fejl i løsningen. Du kan rette videre.'
  } catch (error: any) {
    if (revision !== checkRevision) return
    result.value =
      error?.data?.statusMessage || error?.message || 'Kunne ikke tjekke løsningen. Prøv igen.'
    retryable.value = true
  } finally {
    checking.value = false
  }
}
watch(
  [letters, loaded],
  () => {
    clearTimeout(checkTimer)
    checkRevision++
    result.value = ''
    if (!props.readOnly && loaded.value && count.value === total)
      checkTimer = setTimeout(() => void checkWholePuzzle(), 350)
  },
  { deep: true },
)
onBeforeUnmount(() => {
  stopped = true
  clearTimeout(progressTimer)
  clearInterval(progressClock)
  document.removeEventListener('visibilitychange', resumeProgress)
  clearTimeout(checkTimer)
  checkRevision++
})
watch(checking, (value) => {
  if (!props.readOnly && !value && !result.value && loaded.value && count.value === total) {
    clearTimeout(checkTimer)
    checkTimer = setTimeout(() => void checkWholePuzzle(), 350)
  }
})
onMounted(() => {
  if (props.readOnly) {
    letters.value = Object.fromEntries(
      Object.entries(props.solution || {}).filter(
        ([cell, letter]) => cell in answerCells && /^[A-ZÆØÅ]$/.test(letter),
      ),
    )
    loaded.value = true
    return
  }
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(storageKey) || '{}')
    if (saved && typeof saved === 'object' && !Array.isArray(saved)) {
      letters.value = Object.fromEntries(
        Object.entries(saved).filter(
          ([cell, letter]) =>
            cell in answerCells && typeof letter === 'string' && /^[A-ZÆØÅ]$/.test(letter),
        ),
      )
    }
  } catch {
    saveError.value = true
  }
  loaded.value = true
  if (!props.preview) {
    document.addEventListener('visibilitychange', resumeProgress)
    progressClock = setInterval(() => {
      const nextAt = dailyHelp.value ? dailyHelp.value.nextAt : props.helpAt
      if (!props.completed && !document.hidden && nextAt && Date.parse(nextAt) <= Date.now())
        scheduleProgress(0)
    }, 1000)
  }
})
watch(
  letters,
  (value) => {
    if (props.readOnly || !loaded.value) return
    try {
      localStorage.setItem(storageKey, JSON.stringify(value))
      saveError.value = false
    } catch {
      saveError.value = true
    }
  },
  { deep: true },
)
function chooseWord(index: number) {
  selected.value = index
  cursor.value =
    wordCells[index]!.find((cell) => !letters.value[cell.key])?.key || wordCells[index]![0]!.key
  board.value?.focus({ preventScroll: true })
}
function chooseCell(cell: string) {
  const words = wordCells.flatMap((cells, index) =>
    cells.some((item) => item.key === cell) ? [index] : [],
  )
  if (cursor.value === cell && words.length > 1) {
    selected.value = words[(words.indexOf(selected.value) + 1) % words.length]!
  } else if (!words.includes(selected.value)) selected.value = words[0]!
  cursor.value = cell
  board.value?.focus({ preventScroll: true })
}
function typeLetter(letter: string) {
  if (props.readOnly) return
  const index = activeCells.value.findIndex((cell) => cell.key === cursor.value)
  if (letter === '⌫') {
    if (!letters.value[cursor.value] && index > 0) cursor.value = activeCells.value[index - 1]!.key
    delete letters.value[cursor.value]
  } else if (/^[A-ZÆØÅ]$/.test(letter)) {
    letters.value[cursor.value] = letter
    if (index < activeCells.value.length - 1) cursor.value = activeCells.value[index + 1]!.key
  }
}
function onKey(event: KeyboardEvent) {
  if (props.readOnly) return
  if (event.ctrlKey || event.metaKey || event.altKey) return
  if (event.key === 'Backspace' || /^[a-zæøå]$/i.test(event.key)) {
    event.preventDefault()
    typeLetter(event.key === 'Backspace' ? '⌫' : event.key.toLocaleUpperCase('da-DK'))
  }
}
</script>

<template>
  <div class="crossword-page">
    <PageHeader
      :title="title || 'Kryds & tværs'"
      :back-to="backTo || '/spil/oevrige'"
      compact
    >
      <template #actions
        ><slot name="actions" /><span class="preview-label">{{
          readOnly ? 'Facit' : preview ? 'Preview' : '#' + puzzleId
        }}</span></template
      >
    </PageHeader>
    <div class="puzzle-toolbar">
      <span>Krydsord nr. {{ puzzleId }} · {{ entries.length }} ord</span
      ><span>{{ count }} / {{ total }} felter</span>
      <div
        class="zoom-controls"
        aria-label="Zoom på krydsord"
      >
        <button
          type="button"
          aria-label="Zoom ud"
          :disabled="zoom === 1"
          @click="setZoom(zoom - 1)"
        >
          −
        </button>
        <span aria-live="polite">{{ zoom }}×</span>
        <button
          type="button"
          aria-label="Zoom ind"
          :disabled="zoom === 3"
          @click="setZoom(zoom + 1)"
        >
          +
        </button>
      </div>
    </div>
    <div
      class="board-frame"
      :class="{ zoomed }"
      :style="{ '--crossword-zoom': zoom, '--columns': columns, '--rows': rows }"
    >
      <div
        ref="boardViewport"
        class="board-scroll"
        :class="{ dragging }"
        @pointerdown="startPan"
        @pointermove="movePan"
        @pointerup="endPan"
        @pointercancel="endPan"
        @lostpointercapture="endPan"
        @click.capture="onBoardClick"
      >
        <div
          ref="board"
          class="crossword-board"
          tabindex="0"
          role="group"
          :aria-label="`Krydsord, ${columns} kolonner og ${rows} rækker. ${readOnly ? 'Facit. Vælg et felt for at se ledetråden.' : 'Vælg et felt og skriv med tastaturet.'}`"
          @keydown="onKey"
        >
          <div
            v-for="image in imageEntries"
            :key="image.index"
            class="image-clue"
            :class="{ 'selected-image': selected === image.index, 'icon-clue': image.width === 1 }"
            :style="{
              gridRow: image.row + 1 + ' / span ' + image.height,
              gridColumn: image.col + 1 + ' / span ' + image.width,
            }"
          >
            <button
              type="button"
              class="image-open"
              :aria-label="entries[image.index]!.clue + ', vis billedet større'"
              @click="openImageClue(image.index)"
            >
              <img
                :src="image.src"
                draggable="false"
                :alt="image.alt"
              />
              <span
                v-if="image.width > 1"
                class="image-caption"
                >{{ entries[image.index]!.clue }} <span aria-hidden="true">⤢</span></span
              >
            </button>
            <button
              type="button"
              class="image-arrow"
              :style="imageArrowStyle(image.index)"
              :class="{ down: entries[image.index]!.down }"
              :aria-label="
                'Vælg billedets ord: ' +
                entries[image.index]!.clue +
                ', ' +
                (entries[image.index]!.down ? 'lodret' : 'vandret')
              "
              :aria-pressed="selected === image.index"
              @click="chooseWord(image.index)"
            >
              <span aria-hidden="true">{{ entries[image.index]!.down ? '↓' : '→' }}</span>
            </button>
          </div>
          <template
            v-for="cell in cells"
            :key="cell.key"
          >
            <button
              v-if="cell.clue !== undefined"
              type="button"
              class="clue-cell"
              :style="{ gridRow: cell.row + 1, gridColumn: cell.col + 1 }"
              :class="{ 'selected-clue': selected === cell.clue }"
              :aria-label="`${entries[cell.clue]!.clue}, ${entries[cell.clue]!.down ? 'lodret' : 'vandret'}`"
              @click="chooseWord(cell.clue)"
            >
              <span>{{ entries[cell.clue]!.clue }}</span
              ><b aria-hidden="true">{{ entries[cell.clue]!.down ? '↓' : '→' }}</b>
            </button>
            <button
              v-else-if="cell.key in answerCells"
              type="button"
              class="letter-cell"
              :style="{ gridRow: cell.row + 1, gridColumn: cell.col + 1 }"
              :class="{
                'in-word': activeCells.some((item) => item.key === cell.key),
                current: cursor === cell.key,
                'correct-letter': correctCell(cell.key),
              }"
              :aria-label="`Række ${cell.row + 1}, felt ${cell.col + 1}: ${letters[cell.key] || 'tomt'}${correctCell(cell.key) ? ', korrekt' : ''}`"
              :aria-pressed="cursor === cell.key"
              @click="chooseCell(cell.key)"
            >
              {{ letters[cell.key] }}
            </button>
            <span
              v-else
              class="blank-cell"
              :style="{ gridRow: cell.row + 1, gridColumn: cell.col + 1 }"
              aria-hidden="true"
            />
          </template>
        </div>
      </div>
    </div>
    <p class="saved">
      {{
        readOnly
          ? 'Facit · Kun synligt for admin'
          : saveError
            ? 'Kunne ikke gemme på denne enhed'
            : zoomed
              ? 'Træk i gitteret for at se resten'
              : 'Gemt på denne enhed'
      }}
    </p>
    <div class="active-clue">
      <button
        type="button"
        aria-label="Forrige ord"
        @click="chooseWord((selected + entries.length - 1) % entries.length)"
      >
        ‹
      </button>
      <div>
        <small
          >{{ activeEntry.down ? 'LODRET' : 'VANDRET' }} · {{ activeEntry.length }} BOGSTAVER</small
        ><strong>{{ activeEntry.clue }}</strong>
      </div>
      <button
        type="button"
        aria-label="Næste ord"
        @click="chooseWord((selected + 1) % entries.length)"
      >
        ›
      </button>
    </div>
    <p
      v-if="result || checking"
      class="result"
      role="status"
    >
      {{ checking ? 'Tjekker hele løsningen…' : result }}
      <button
        v-if="retryable && count === total"
        type="button"
        class="retry-check"
        @click="checkWholePuzzle"
      >
        Prøv igen
      </button>
    </p>
    <div
      v-if="!readOnly"
      class="keyboard"
      aria-label="Bogstavtastatur"
    >
      <div
        v-for="row in ['QWERTYUIOP', 'ASDFGHJKLÆ', 'ZXCVBNMØÅ⌫']"
        :key="row"
        class="keyboard-row"
      >
        <button
          v-for="letter in row"
          :key="letter"
          type="button"
          :aria-label="letter === '⌫' ? 'Slet bogstav' : letter"
          @click="typeLetter(letter)"
        >
          {{ letter }}
        </button>
      </div>
    </div>
    <p
      v-if="!readOnly"
      class="preview-note"
    >
      {{
        dailyHelp?.available
          ? 'Grønne felter er korrekte · Nyt tjek hver dag kl. 04.'
          : firstHelpTime
            ? 'Hjælp fra ' + firstHelpTime + ' · derefter dagligt kl. 04.'
            : 'Hele løsningen tjekkes, når alle felter er udfyldt.'
      }}
    </p>
    <p
      v-if="helpError"
      class="help-error"
      role="status"
    >
      Kunne ikke synkronisere hjælpen.
      <button
        type="button"
        @click="scheduleProgress(0)"
      >
        Prøv igen
      </button>
    </p>
    <AppDialog
      v-if="openedImage?.image"
      label="Billedledetråd"
      @close="imageOpen = null"
    >
      <section class="image-dialog">
        <header>
          <h2>{{ openedImage.clue }}</h2>
          <button
            type="button"
            aria-label="Luk billedet"
            @click="imageOpen = null"
          >
            ×
          </button>
        </header>
        <img
          :src="openedImage.image.src"
          :alt="openedImage.image.alt"
        />
        <p>
          {{ openedImage.length }} bogstaver · {{ openedImage.down ? 'Lodret' : 'Vandret' }} fra
          billedets pil
        </p>
        <button
          type="button"
          class="btn"
          @click="imageOpen = null"
        >
          Tilbage til krydsordet
        </button>
      </section>
    </AppDialog>
  </div>
</template>

<style scoped>
.retry-check {
  margin-left: 8px;
  border: 1px solid var(--hairline);
  border-radius: 8px;
  padding: 4px 7px;
  background: var(--surface);
}
.crossword-page {
  display: flex;
  flex-direction: column;
  gap: 8px;
  height: 100%;
  min-height: 0;
  max-width: 560px;
  margin: 0 auto;
  padding: calc(10px + var(--safe-t)) 12px 10px;
  overflow: hidden;
}
.crossword-page :deep(.page-heading) {
  margin-bottom: 0;
}
.preview-label {
  border: 1px solid var(--hairline);
  border-radius: 999px;
  padding: 5px 10px;
  font-size: 11px;
  color: var(--muted);
}
.puzzle-toolbar {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  flex: none;
  font-size: 11px;
  color: var(--muted);
}
.board-frame {
  position: relative;
  flex: 1;
  min-height: 0;
  container-type: size;
  border-radius: 16px;
  background: var(--surface-2);
  border: 1px solid var(--hairline);
  overflow: hidden;
}
.board-scroll {
  position: absolute;
  inset: 6px;
  display: grid;
  place-items: center;
  overflow: hidden;
}
.zoomed .board-scroll {
  display: block;
  overflow: auto;
  overscroll-behavior: contain;
  touch-action: pan-x pan-y pinch-zoom;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  cursor: grab;
  user-select: none;
}
.zoomed .board-scroll :is(button, .crossword-board) {
  cursor: inherit;
}
.zoomed .board-scroll.dragging {
  cursor: grabbing;
}
.zoomed .board-scroll::-webkit-scrollbar {
  display: none;
}
.zoom-controls {
  display: flex;
  align-items: center;
  gap: 5px;
}
.zoom-controls button {
  width: 32px;
  height: 32px;
  border: 1px solid var(--hairline);
  border-radius: 9px;
  background: var(--surface);
  font-size: 20px;
}
.zoom-controls button:disabled {
  opacity: 0.35;
}
.zoom-controls span {
  min-width: 19px;
  text-align: center;
  font-size: 10px;
}
.crossword-board {
  container-type: inline-size;
  -webkit-text-size-adjust: none;
  text-size-adjust: none;
  width: min(calc(100cqw - 12px), calc((100cqh - 12px) * var(--columns) / var(--rows)));
  aspect-ratio: var(--columns) / var(--rows);
  display: grid;
  grid-template-columns: repeat(var(--columns), minmax(0, 1fr));
  grid-template-rows: repeat(var(--rows), minmax(0, 1fr));
  gap: 0;
}
.zoomed .crossword-board {
  width: calc(
    min(calc(100cqw - 12px), calc((100cqh - 12px) * var(--columns) / var(--rows))) *
      var(--crossword-zoom)
  );
  margin: 0 auto;
}
.crossword-board > * {
  min-width: 0;
  min-height: 0;
  padding: 0;
}
.image-clue {
  position: relative;
  border: 1px solid var(--hairline);
  border-radius: 5px;
  overflow: hidden;
  background: var(--surface);
  cursor: pointer;
}
.image-open {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
}
.image-clue img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: 50% 75%;
}
.image-caption {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-between;
  gap: calc(100cqi / var(--columns) * 0.08);
  padding: calc(100cqi / var(--columns) * 0.15);
  background: linear-gradient(transparent, #000c);
  color: white;
  font-size: calc(100cqi / var(--columns) * 0.3);
  line-height: 1.1;
  font-weight: 800;
}
.image-arrow {
  border: 0;
  padding: 0;
  cursor: pointer;
  z-index: 1;
  position: absolute;
  right: 0;
  top: 0;
  display: grid;
  place-items: center;
  width: 24%;
  height: 24%;
  background: var(--accent);
  color: var(--on-accent);
  font-size: calc(100cqi / var(--columns) * 0.6);
  line-height: 1;
  border-radius: 0 0 0 5px;
}
.image-arrow.down {
  top: auto;
  right: auto;
  bottom: 0;
  left: 0;
  border-radius: 0 5px 0 0;
}
.selected-image {
  box-shadow: inset 0 0 0 2px var(--accent);
  outline: 2px solid var(--accent);
  outline-offset: -2px;
}
.icon-clue {
  border-radius: 2px;
  background: var(--surface);
}
.icon-clue img {
  object-fit: contain;
  padding: 1px;
}
.icon-clue .image-arrow {
  width: 30%;
  height: 30%;
  font-size: calc(100cqi / var(--columns) * 0.23);
}
.image-dialog {
  padding: 18px;
}
.image-dialog header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}
.image-dialog h2 {
  font-size: 22px;
}
.image-dialog header button {
  width: 44px;
  height: 44px;
  border: 1px solid var(--hairline);
  border-radius: 12px;
  background: var(--surface-2);
  font-size: 25px;
}
.image-dialog img {
  display: block;
  width: 100%;
  max-height: 62dvh;
  object-fit: contain;
  border-radius: 12px;
}
.image-dialog p {
  color: var(--muted);
  font-size: 12px;
  text-align: center;
}
.image-dialog .btn {
  width: 100%;
}
.clue-cell,
.letter-cell {
  position: relative;
  border: 1px solid color-mix(in srgb, var(--text) 20%, transparent);
  border-radius: 2px;
  background: color-mix(in srgb, var(--surface) 90%, var(--text));
}
.clue-cell {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: color-mix(in srgb, var(--accent) 12%, var(--surface));
  cursor: pointer;
  line-height: 1.05;
  overflow-wrap: anywhere;
  overflow: hidden;
}
.clue-cell span {
  font-size: calc(100cqi / var(--columns) * 0.15);
  font-weight: 800;
  line-height: 1.1;
  padding: calc(100cqi / var(--columns) * 0.025);
  max-width: 100%;
  box-sizing: border-box;
}
.clue-cell b {
  font-size: calc(100cqi / var(--columns) * 0.2);
  line-height: 0.9;
}
.letter-cell {
  display: grid;
  place-items: center;
  font-size: calc(100cqi / var(--columns) * 0.62);
  line-height: 1;
  font-weight: 750;
  cursor: pointer;
  overflow: hidden;
}
.in-word {
  background: color-mix(in srgb, var(--accent) 24%, var(--surface));
}
.current {
  background: var(--accent);
  color: var(--on-accent);
  box-shadow: inset 0 0 0 2px var(--on-accent);
}
.selected-clue {
  border-color: var(--accent);
}
.letter-cell.correct-letter {
  background: light-dark(#d7efdf, #244e38);
  border-color: light-dark(#529b69, #609c75);
  color: light-dark(#1d5934, #b8f0ca);
}
.letter-cell.correct-letter.current {
  box-shadow: inset 0 0 0 2px light-dark(#287343, #95d7ac);
}
.help-error {
  margin: 0;
  font-size: 10px;
  color: var(--muted);
  text-align: center;
}
.help-error button {
  border: 0;
  background: transparent;
  color: var(--text);
  font: inherit;
  text-decoration: underline;
}
.saved {
  flex: none;
  font-size: 10px;
  color: var(--muted);
  margin: 0;
  text-align: center;
}
.active-clue {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  background: var(--surface);
  border: 1px solid var(--hairline);
  border-radius: 15px;
  padding: 3px;
}
.active-clue div {
  text-align: center;
}
.active-clue small {
  display: block;
  color: var(--muted);
  font-size: 9px;
  letter-spacing: 0.05em;
}
.active-clue strong {
  display: block;
  margin-top: 2px;
  font-size: 14px;
}
.active-clue button {
  flex: none;
  border: 0;
  background: transparent;
  border-radius: 10px;
  width: 44px;
  height: 44px;
  font-size: 28px;
}
.keyboard {
  flex: none;
  display: grid;
  gap: 4px;
}
.keyboard-row {
  display: flex;
  gap: 4px;
}
.keyboard-row button {
  flex: 1;
  min-width: 0;
  height: clamp(32px, 5dvh, 42px);
  padding: 0;
  border: 1px solid var(--hairline);
  border-radius: 8px;
  background: var(--surface);
  box-shadow: var(--shadow-sm);
  font-size: 13px;
  font-weight: 750;
  touch-action: manipulation;
}
.result {
  flex: none;
  margin: 0;
  padding: 8px;
  background: var(--accent-soft);
  border-radius: 12px;
  color: var(--text);
  font-size: 12px;
}
.preview-note {
  flex: none;
  color: var(--muted);
  text-align: center;
  font-size: 10px;
  line-height: 1.4;
  margin: 0;
}
button:focus-visible,
.crossword-board:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}
@media (max-height: 650px) {
  .crossword-page {
    gap: 5px;
    padding-top: 6px;
    padding-bottom: 6px;
  }
  .saved {
    display: none;
  }
}
</style>
