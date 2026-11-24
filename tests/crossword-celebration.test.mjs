import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { ref } from 'vue'

function board(overrides = {}) {
  const source = readFileSync('app/components/CrosswordBoard.vue', 'utf8')
  const code = source.slice(
    source.indexOf('let celebratedCompletion ='),
    source.indexOf('\nwatch(\n  [letters, loaded]'),
  )
  let bursts = 0
  const context = vm.createContext({
    props: {
      readOnly: false,
      preview: false,
      completed: false,
      checkAnswers: async () => ({ correct: true }),
      ...overrides,
    },
    letters: ref({ '0:0': 'A' }),
    count: ref(1),
    total: 1,
    checking: ref(false),
    retryable: ref(false),
    result: ref(''),
    checkRevision: 0,
    nextTick: async () => {},
    shootConfetti: async () => {
      bursts++
    },
  })
  vm.runInContext(
    ts.transpileModule(code + '\nglobalThis.check = checkWholePuzzle', {
      compilerOptions: { target: ts.ScriptTarget.ES2022 },
    }).outputText,
    context,
  )
  return { context, bursts: () => bursts }
}

test('a new completion celebrates once, after the successful result is visible', async () => {
  const b = board()
  b.context.props.checkAnswers = async () => {
    b.context.props.completed = true
    return { correct: true }
  }
  b.context.nextTick = async () => {
    assert.equal(b.context.result.value, 'Hele krydsordet er korrekt!')
    assert.equal(b.bursts(), 0)
  }
  await b.context.check()
  await b.context.check()
  assert.equal(b.bursts(), 1)
})

test('incorrect answers do not celebrate; a subsequent correction does', async () => {
  const b = board({ checkAnswers: async () => ({ correct: false }) })
  await b.context.check()
  assert.equal(b.bursts(), 0)
  b.context.props.checkAnswers = async () => ({ correct: true })
  await b.context.check()
  assert.equal(b.bursts(), 1)
})

test('preview, admin read-only and previously completed puzzles do not celebrate', async () => {
  for (const props of [{ preview: true }, { readOnly: true }, { completed: true }]) {
    const b = board(props)
    await b.context.check()
    assert.equal(b.bursts(), 0)
  }
})

test('a stale submission cannot celebrate', async () => {
  const b = board()
  b.context.props.checkAnswers = async () => {
    b.context.checkRevision++
    return { correct: true }
  }
  await b.context.check()
  assert.equal(b.bursts(), 0)
})

test('an animation failure cannot turn a correct solution into an error', async () => {
  const b = board()
  b.context.shootConfetti = async () => {
    throw new Error('animation unavailable')
  }
  await b.context.check()
  assert.equal(b.context.result.value, 'Hele krydsordet er korrekt!')
  assert.equal(b.context.retryable.value, false)
})
