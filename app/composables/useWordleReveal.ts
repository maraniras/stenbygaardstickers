import type { Ref } from 'vue'
import type { WordleView } from '../../shared/types/wordle'

export function useWordleReveal(
  source: Ref<WordleView | undefined>,
  identity: Ref<string>,
  onWin: () => void | Promise<void>,
) {
  const notificationLock = useState('daily-game-animation', () => false)
  const shown = ref<WordleView>()
  const keyboard = ref<WordleView>()
  const animating = ref(false)
  const flipping = ref<number | null>(null)
  let pending: { identity: string; guess: string } | undefined
  let generation = 0
  let previousIdentity = ''
  const timers = new Map<ReturnType<typeof setTimeout>, () => void>()
  const clone = (run: WordleView | undefined) =>
    run ? { ...run, guesses: [...run.guesses], marks: run.marks.map((row) => [...row]) } : undefined
  function cancel() {
    generation++
    for (const [timer, resolve] of timers) {
      clearTimeout(timer)
      resolve()
    }
    timers.clear()
    animating.value = false
    flipping.value = null
    notificationLock.value = false
  }
  const pause = (ms: number) =>
    new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        timers.delete(timer)
        resolve()
      }, ms)
      timers.set(timer, resolve)
    })
  async function reveal(run: WordleView) {
    cancel()
    const current = generation
    const row = run.guesses.length - 1
    animating.value = true
    notificationLock.value = true
    shown.value = {
      ...clone(run)!,
      marks: [...run.marks.slice(0, row).map((m) => [...m]), []],
      finished: false,
      won: false,
      reward: 0,
      answer: undefined,
    }
    for (let column = 0; column < 5; column++) {
      flipping.value = column
      await pause(200)
      if (current !== generation) return
      shown.value!.marks[row]![column] = run.marks[row]![column]!
      await pause(220)
      if (current !== generation) return
      flipping.value = null
    }
    shown.value = clone(run)
    keyboard.value = clone(run)
    animating.value = false
    // Paint the full result before starting celebration; defer all reward popups until it ends.
    await nextTick()
    if (current !== generation) return
    try {
      if (run.won) await onWin()
    } catch {
      // A failed optional celebration must never leave badges blocked.
    } finally {
      if (current === generation) notificationLock.value = false
    }
  }
  watch(
    [identity, source],
    ([owner, run]) => {
      const sameOwner = owner === previousIdentity
      previousIdentity = owner
      if (
        sameOwner &&
        run &&
        pending?.identity === owner &&
        run.guesses.length === (shown.value?.guesses.length ?? 0) + 1 &&
        run.guesses.at(-1) === pending.guess
      ) {
        pending = undefined
        void reveal(run)
        return
      }
      // A same-count refresh while the guess is in flight must not disarm its reveal.
      if (
        sameOwner &&
        run &&
        !animating.value &&
        pending &&
        run.guesses.length === shown.value?.guesses.length
      )
        return
      if (
        sameOwner &&
        notificationLock.value &&
        run?.guesses.join('|') === shown.value?.guesses.join('|')
      )
        return
      pending = undefined
      cancel()
      shown.value = clone(run)
      keyboard.value = clone(run)
    },
    { immediate: true },
  )
  onScopeDispose(cancel)
  return {
    shown,
    keyboard,
    animating,
    flipping,
    expectReveal: (guess: string) => {
      pending = { identity: identity.value, guess }
      notificationLock.value = true
    },
    disarm: () => {
      if (pending) notificationLock.value = false
      pending = undefined
    },
  }
}
