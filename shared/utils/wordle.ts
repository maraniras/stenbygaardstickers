import type { WordleMark, WordleView } from '../types/wordle'
export const WORDLE_REWARDS = [50, 40, 30, 20, 15, 10] as const
export function wordleRows(run: WordleView | undefined, draft: string) {
  return Array.from({ length: 6 }, (_, row) =>
    Array.from({ length: 5 }, (_, col) => ({
      letter:
        run?.guesses[row]?.[col] ??
        (row === (run?.guesses.length ?? 0) && !run?.finished ? (draft[col] ?? '') : ''),
      mark: run?.marks[row]?.[col],
    })),
  )
}
export function normalizeWordle(input: unknown) {
  return typeof input === 'string' ? input.normalize('NFC').trim().toLocaleUpperCase('da-DK') : ''
}
/** Correct positions consume letters first, so duplicates cannot earn extra yellow tiles. */
export function scoreWordle(guess: string, answer: string): WordleMark[] {
  const marks: WordleMark[] = Array(5).fill('absent')
  const remaining = [...answer]
  for (let i = 0; i < 5; i++)
    if (guess[i] === answer[i]) {
      marks[i] = 'correct'
      remaining[i] = ''
    }
  for (let i = 0; i < 5; i++) {
    if (marks[i] === 'correct') continue
    const index = remaining.indexOf(guess[i]!)
    if (index >= 0) {
      marks[i] = 'present'
      remaining[index] = ''
    }
  }
  return marks
}
