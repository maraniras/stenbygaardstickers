<script setup lang="ts">
import type { WordleMark } from '../../../shared/types/wordle'
import { WORDLE_REWARDS, wordleRows } from '../../../shared/utils/wordle'

useHead({ title: 'Wordle · Stenbygaard Stickers' })
const { name, ready } = useUser()
const { state, reload, guessWordle, error: loadError } = useEconomy()
const serverRun = computed(() => state.value?.wordle)
const identity = computed(() => `${name.value ?? ''}:${state.value?.day ?? ''}`)
const {
  shown: run,
  keyboard,
  animating,
  flipping,
  expectReveal,
  disarm,
} = useWordleReveal(serverRun, identity, () => shootConfetti('normal', true))
const input = ref('')
const boardRows = computed(() => wordleRows(run.value, input.value))
const busy = ref(false)
const error = ref('')
const page = ref<HTMLElement>()
const rules = ref<HTMLDialogElement>()
const marks = computed(() => {
  const result: Partial<Record<string, WordleMark>> = {}
  const rank = { absent: 1, present: 2, correct: 3 }
  keyboard.value?.guesses.forEach((guess, row) =>
    [...guess].forEach((letter, col) => {
      const mark = keyboard.value?.marks[row]?.[col]
      if (mark && rank[mark] > (result[letter] ? rank[result[letter]!] : 0)) result[letter] = mark
    }),
  )
  return result
})
const disabled = computed(
  () => !name.value || !run.value || run.value.finished || busy.value || animating.value,
)
const message = computed(() =>
  run.value?.finished
    ? run.value.won
      ? `Du fandt ordet! +${run.value.reward} 🍌`
      : `Dagens ord var ${run.value.answer}`
    : `${run.value?.guesses.length ?? 0}/6 forsøg · Op til 50 🍌`,
)
let alive = true
function draftKey() {
  return name.value && state.value?.day
    ? `wordle-draft:references-v1:${encodeURIComponent(name.value.toLocaleLowerCase('da'))}:${state.value.day}`
    : null
}
watch(
  [name, () => state.value?.day, () => serverRun.value?.guesses.length],
  () => {
    input.value = ''
    error.value = ''
    try {
      const key = draftKey(),
        draft = key ? JSON.parse(localStorage.getItem(key) ?? 'null') : null
      if (
        draft?.count === (run.value?.guesses.length ?? 0) &&
        typeof draft.word === 'string' &&
        /^[A-ZÆØÅ]{0,5}$/.test(draft.word)
      )
        input.value = draft.word
    } catch {}
  },
  { immediate: true },
)
watch(input, (value) => {
  const key = draftKey()
  if (key)
    try {
      localStorage.setItem(
        key,
        JSON.stringify({ word: value, count: run.value?.guesses.length ?? 0 }),
      )
    } catch {}
})

async function submit() {
  if (disabled.value) return
  if (input.value.length !== 5) {
    error.value = 'Skriv fem bogstaver først.'
    return
  }
  const owner = name.value,
    day = state.value?.day,
    token = userToken()
  busy.value = true
  error.value = ''
  expectReveal(input.value)
  try {
    await guessWordle(input.value, run.value!.guesses.length)
    if (!alive || owner !== name.value || token !== userToken() || day !== state.value?.day) return
    input.value = ''
  } catch (err: unknown) {
    disarm()
    if (!alive || owner !== name.value || token !== userToken()) return
    const failure = err as {
      statusCode?: number
      data?: { statusCode?: number; statusMessage?: string }
    }
    if (failure.statusCode === 409 || failure.data?.statusCode === 409) await reload()
    error.value =
      failure.data?.statusMessage ||
      'Gættet kunne ikke bekræftes. Prøv igen — samme gæt tæller kun én gang.'
  } finally {
    if (alive) busy.value = false
  }
}
function press(key: string) {
  if (disabled.value) return
  if (key === 'Enter') {
    void submit()
    return
  }
  if (key === 'Backspace') input.value = input.value.slice(0, -1)
  else if (/^[A-ZÆØÅ]$/.test(key) && input.value.length < 5) input.value += key
  error.value = ''
}
function keydown(event: KeyboardEvent) {
  if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing || rules.value?.open)
    return
  if (/^[a-zæøå]$/i.test(event.key) || ['Enter', 'Backspace'].includes(event.key)) {
    // Let Enter activate buttons and links normally; letter keys still work after a keyboard tap.
    if (
      event.key === 'Enter' &&
      event.target instanceof HTMLElement &&
      event.target.closest('button, a') &&
      !event.target.closest('.wordle-keyboard')
    )
      return
    event.preventDefault()
    press(event.key.length === 1 ? event.key.toLocaleUpperCase('da') : event.key)
  }
}
onMounted(() => page.value?.focus({ preventScroll: true }))
onBeforeUnmount(() => {
  alive = false
})
</script>

<template>
  <div
    ref="page"
    class="wordle-page"
    tabindex="0"
    @keydown="keydown"
  >
    <PageHeader
      title="Wordle"
      back-to="/spil"
      back-label="Tilbage til daglige spil"
    >
      <template #actions
        ><button
          class="chip"
          type="button"
          @click="rules?.showModal()"
        >
          Regler
        </button></template
      >
    </PageHeader>
    <div class="wordle-meta"><span>Ét ord · Seks forsøg</span><span>Nyt ord kl. 04</span></div>
    <div
      v-if="ready && !name"
      class="login"
    >
      <p>Vælg dit navn for at spille og gemme dine forsøg.</p>
      <NuxtLink
        class="btn"
        to="/mig"
        >Vælg mit navn</NuxtLink
      >
    </div>
    <div class="board-space">
      <div
        class="wordle-board"
        role="group"
        aria-label="Seks rækker med fem bogstaver"
      >
        <div
          v-for="(row, rowIndex) in boardRows"
          :key="`${state?.day}-${rowIndex}`"
          class="wordle-row"
          :aria-label="`Forsøg ${rowIndex + 1}${run?.guesses[rowIndex] ? ': ' + run.guesses[rowIndex] : ''}`"
        >
          <span
            v-for="(tile, colIndex) in row"
            :key="colIndex"
            class="tile"
            :class="[
              tile.mark,
              {
                filled: !!tile.letter && !tile.mark,
                flipping:
                  animating && rowIndex === (run?.guesses.length ?? 0) - 1 && flipping === colIndex,
              },
            ]"
            :aria-label="
              tile.mark === 'correct'
                ? `${tile.letter}: korrekt plads`
                : tile.mark === 'present'
                  ? `${tile.letter}: forkert plads`
                  : tile.mark === 'absent'
                    ? `${tile.letter}: findes ikke i ordet`
                    : undefined
            "
            >{{ tile.letter }}</span
          >
        </div>
      </div>
    </div>
    <div
      class="game-status"
      :class="{ won: run?.won }"
      role="status"
      aria-live="polite"
    >
      <b>{{
        animating
          ? 'Dit gæt afsløres…'
          : busy
            ? 'Tjekker dit gæt…'
            : !run && name
              ? 'Henter dagens ord…'
              : message
      }}</b>
      <span v-if="run?.finished"
        >{{ run.won ? `${run.answer} · ${run.guesses.length}/6` : 'En ny chance i morgen' }} · Nyt
        ord kl. 04</span
      >
    </div>
    <div
      class="feedback"
      role="alert"
    >
      <span>{{ error || loadError }}</span
      ><button
        v-if="loadError"
        class="link"
        @click="reload"
      >
        Prøv igen
      </button>
    </div>
    <WordleKeyboard
      :marks="marks"
      :disabled="disabled"
      @press="press"
    />
    <dialog
      ref="rules"
      class="rules"
      aria-labelledby="wordle-rules-title"
      @click="$event.target === rules && rules?.close()"
    >
      <h2 id="wordle-rules-title">Gæt dagens ord</h2>
      <p>
        Du har seks forsøg til at finde et ord på fem bogstaver. Æ, Ø og Å tæller hver som ét
        bogstav.
      </p>
      <p>
        <b class="correct-label">Grøn:</b> rigtigt bogstav, rigtig plads.<br /><b
          class="present-label"
          >Gul:</b
        >
        bogstavet er med, men står forkert.<br /><b>Grå:</b> bogstavet er ikke med — eller er
        allerede brugt i en anden grøn/gul boks.
      </p>
      <p>Alle spiller samme ord. Dine forsøg gemmes, og et nyt ord kommer kl. 04.</p>
      <p>
        Du vinder {{ WORDLE_REWARDS.join('/') }} bananer ved at løse ordet på 1–6 forsøg. Et ukendt
        ord bruger ikke et forsøg.
      </p>
      <button
        class="btn"
        @click="rules?.close()"
      >
        Forstået
      </button>
    </dialog>
  </div>
</template>

<style scoped>
.wordle-page {
  --wordle-correct: #387b57;
  --wordle-present: #a27924;
  box-sizing: border-box;
  height: var(--content-height);
  max-width: 480px;
  margin: 0 auto;
  padding: calc(12px + var(--safe-t)) 10px 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow: hidden;
  outline: none;
}
.wordle-page :deep(.page-heading) {
  flex: none;
  margin-bottom: 0;
}
.wordle-meta {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  color: var(--muted);
  font-size: 11px;
  flex: none;
}
.board-space {
  flex: 1;
  min-height: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  padding-block: 4px;
}
.wordle-board {
  height: min(100%, 360px);
  aspect-ratio: 5 / 6;
  max-width: 100%;
  display: grid;
  grid-template-rows: repeat(6, minmax(0, 1fr));
  gap: 5px;
}
.wordle-row {
  perspective: 600px;
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 5px;
  min-height: 0;
}
.tile {
  display: grid;
  place-items: center;
  min-width: 0;
  border: 2px solid var(--hairline);
  border-radius: 9px;
  background: var(--surface);
  color: var(--text);
  font-size: clamp(18px, 6vw, 28px);
  font-weight: 850;
}
.tile.filled {
  border-color: var(--muted);
}
.tile.flipping {
  animation: wordle-flip 420ms ease-in-out;
}
@keyframes wordle-flip {
  0%,
  100% {
    transform: rotateX(0deg);
  }
  48%,
  52% {
    transform: rotateX(90deg);
  }
}
@media (prefers-reduced-motion: reduce) {
  .tile.flipping {
    animation: none;
  }
}
.tile.correct {
  background: var(--wordle-correct);
  color: white;
  border-color: transparent;
}
.tile.present {
  background: var(--wordle-present);
  color: white;
  border-color: transparent;
}
.tile.absent {
  background: #646975;
  color: white;
  border-color: transparent;
}
.game-status {
  text-align: center;
  font-size: 13px;
  min-height: 20px;
  flex: none;
}
.game-status span {
  display: block;
  margin-top: 3px;
  font-size: 11px;
  color: var(--muted);
}
.game-status.won b,
.correct-label {
  color: var(--wordle-correct);
}
.present-label {
  color: var(--wordle-present);
}
.feedback {
  min-height: 16px;
  flex: none;
  color: var(--danger, #bc5158);
  font-size: 11px;
  text-align: center;
}
.feedback:has(span:not(:empty)) {
  min-height: 28px;
}
.login {
  text-align: center;
  font-size: 12px;
  flex: none;
}
.login p {
  margin-bottom: 8px;
}
.login .btn {
  padding: 8px 15px;
  min-height: 36px;
}
.rules {
  margin: auto;
  width: min(400px, calc(100vw - 32px));
  max-height: calc(100dvh - 60px);
  overflow-y: auto;
  border: 1px solid var(--hairline);
  border-radius: 24px;
  padding: 22px;
  background: var(--surface);
  color: var(--text);
}
.rules::backdrop {
  background: #080612a8;
  backdrop-filter: blur(5px);
}
.rules p {
  font-size: 14px;
  line-height: 1.65;
  margin: 14px 0;
}
@media (max-height: 650px) {
  .wordle-page {
    gap: 4px;
    padding-top: calc(6px + var(--safe-t));
  }
  .feedback {
    min-height: 13px;
  }
}
</style>
