import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { ref } from 'vue'
import { setup } from './helpers/economy-harness.mjs'

test('daily feedback locks correct letters, snapshots only entered mistakes and clears red after editing', () => {
  const { api: a } = setup(false, ['server/utils/crossword.ts'])
  const state = { ...a.freshCrossword(), opensAt: '2026-11-16T12:00:00Z' }
  const solution = a.crosswordSolution(),
    [green, red, blank] = Object.keys(solution)
  const wrong = solution[red] === 'A' ? 'B' : 'A',
    another = wrong === 'C' ? 'D' : 'C'
  a.crosswordHelp(
    state,
    'u:anna',
    { [green]: solution[green], [red]: wrong },
    new Date('2026-11-17T12:00:00Z'),
  )
  let response = a.crosswordHelp(
    state,
    'u:anna',
    { [green]: solution[green], [red]: wrong },
    new Date('2026-11-18T03:00:00Z'),
  )
  assert.equal(response.correctLetters[green], solution[green])
  assert.equal(response.incorrectLetters[red], wrong)
  assert.equal(response.incorrectLetters[blank], undefined)
  response = a.crosswordHelp(
    state,
    'u:anna',
    { [green]: 'Z', [red]: another, [blank]: 'A' },
    new Date('2026-11-18T04:00:00Z'),
  )
  assert.equal(
    state.progress['u:anna'].letters[green],
    solution[green],
    'stale devices cannot overwrite confirmed letters',
  )
  assert.equal(response.incorrectLetters[red], undefined)
  assert.equal(
    response.incorrectLetters[blank],
    undefined,
    'new edits receive no immediate correctness feedback',
  )
  response = a.crosswordHelp(state, 'u:anna', { [red]: wrong }, new Date('2026-11-18T05:00:00Z'))
  assert.equal(
    response.incorrectLetters[red],
    undefined,
    'retyping the old mistake does not bring red back',
  )
  assert.equal(
    state.progress['u:anna'].letters[green],
    solution[green],
    'deletion cannot remove a locked letter',
  )
  response = a.crosswordHelp(state, 'u:anna', { [red]: wrong }, new Date('2026-11-19T03:00:00Z'))
  assert.equal(
    response.incorrectLetters[red],
    wrong,
    'next daily check can mark a mistake red again',
  )
  assert.equal(response.correctLetters[green], solution[green])
})

function board() {
  const source = readFileSync('app/components/CrosswordBoard.vue', 'utf8')
  const feedback = source.slice(
    source.indexOf('function lockedCell('),
    source.indexOf('function scheduleProgress('),
  )
  const typing = source.slice(
    source.indexOf('function typeLetter('),
    source.indexOf('function onKey('),
  )
  const context = vm.createContext({
    props: { readOnly: false },
    letters: ref({ '0:0': 'A', '0:1': 'B', '0:2': 'C' }),
    cursor: ref('0:0'),
    activeCells: ref(['0:0', '0:1', '0:2', '0:3'].map((key) => ({ key }))),
    dailyHelp: ref({
      available: true,
      correctLetters: { '0:0': 'A', '0:2': 'C' },
      incorrectLetters: { '0:1': 'B' },
    }),
    clearedIncorrect: ref({}),
    feedbackDay: '2026-11-24',
    storageKey: 'test',
    localStorage: { setItem: () => {} },
  })
  vm.runInContext(
    ts.transpileModule(
      feedback + typing + '\nglobalThis.api={correctCell,incorrectCell,lockedCell,typeLetter}',
      { compilerOptions: { target: ts.ScriptTarget.ES2022 } },
    ).outputText,
    context,
  )
  return context
}
test('actual board keyboard cannot replace/delete green letters and skips locked cells while advancing', () => {
  const b = board()
  b.api.typeLetter('Z')
  b.api.typeLetter('⌫')
  assert.equal(b.letters.value['0:0'], 'A')
  b.cursor.value = '0:1'
  b.api.typeLetter('D')
  assert.equal(b.letters.value['0:1'], 'D')
  assert.equal(b.cursor.value, '0:3', 'typing advances past the locked green cell')
  b.api.typeLetter('⌫')
  assert.equal(b.cursor.value, '0:1', 'backspace skips the green cell')
  assert.equal(b.letters.value['0:2'], 'C')
  assert.equal(b.letters.value['0:1'], undefined)
})
test('actual board removes red immediately on typing or deletion, including retyping the same value', () => {
  const b = board()
  assert.equal(b.api.incorrectCell('0:1'), true)
  b.cursor.value = '0:1'
  b.api.typeLetter('B')
  assert.equal(b.api.incorrectCell('0:1'), false)
  b.cursor.value = '0:1'
  b.api.typeLetter('⌫')
  assert.equal(b.api.incorrectCell('0:1'), false)
  b.cursor.value = '0:1'
  b.api.typeLetter('B')
  assert.equal(b.api.incorrectCell('0:1'), false)
  assert.equal(b.api.correctCell('0:0'), true)
})
