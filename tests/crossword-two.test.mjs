import assert from 'node:assert/strict'
import test from 'node:test'
import { existsSync } from 'node:fs'
import { crosswordSetup } from './helpers/crossword-harness.mjs'

const now = new Date('2027-01-04T12:00:00Z')
const game = (remote = false) => crosswordSetup(remote, ['server/data/crossword-2.ts'])

test('crossword two stays locked, including direct submissions, and preview contains no answers', () => {
  const { api: a } = game()
  const state = a.freshCrossword('2')
  assert.equal(a.crosswordView(state, undefined, false, now).puzzle, undefined)
  assert.throws(() => a.submitCrossword(state, 'Anna', a.crosswordSolution('2'), now), {
    statusCode: 403,
  })
  const view = a.crosswordView(state, undefined, true, now)
  assert.equal(view.title, 'På Tværs #2')
  assert.equal(view.winnerPrize, 1000)
  assert.equal(view.completionPrize, 50)
  assert.equal(view.puzzle.entries.length, 170)
  assert.ok(view.puzzle.entries.every((e) => !('answer' in e)))
  assert.notEqual(
    view.puzzle.revision,
    a.crosswordView(a.freshCrossword(), undefined, true, now).puzzle.revision,
  )
})

test('import preserves 592 cells, 253 crossings, displaced clues, photos and wall-free adjacency', () => {
  const { api: a } = game()
  const cells = new Map(),
    clues = new Set()
  for (const [id, e] of a.CROSSWORD_2_ENTRIES.entries()) {
    if (!e.image)
      clues.add(`${e.clueRow ?? e.row - (e.down ? 1 : 0)}:${e.clueCol ?? e.col - (e.down ? 0 : 1)}`)
    for (const [i, letter] of [...e.answer].entries()) {
      const row = e.row + (e.down ? i : 0),
        col = e.col + (e.down ? 0 : i),
        key = `${row}:${col}`
      const cell = cells.get(key) || { letter, row, col, owners: [] }
      assert.equal(cell.letter, letter)
      cell.owners.push({ id, down: e.down })
      cells.set(key, cell)
    }
    if (e.image) {
      assert.equal(e.image.width, 3)
      assert.equal(e.image.height, 3)
      assert.ok(existsSync('public' + e.image.src))
    }
  }
  assert.equal(cells.size, 592)
  assert.equal([...cells.values()].filter((c) => c.owners.length === 2).length, 253)
  for (const [key, c] of cells) {
    assert.ok(!clues.has(key), 'a clue cannot cover a letter')
    for (const down of [false, true]) {
      const n = cells.get(`${c.row + (down ? 1 : 0)}:${c.col + (down ? 0 : 1)}`)
      if (n)
        assert.ok(
          c.owners.some((p) => p.down === down && n.owners.some((q) => q.id === p.id)),
          'adjacent cells need a common word, without a wall',
        )
    }
  }
})

for (const remote of [false, true])
  test(`crossword two opens at its own time, pays 1000/50 once and stays isolated (${remote ? 'redis' : 'local'})`, async () => {
    const { api: a } = game(remote)
    const state = { ...a.freshCrossword('2'), opensAt: now.toISOString() }
    const answers = a.crosswordSolution('2')
    assert.equal(
      a.crosswordView(state, undefined, false, new Date(now.getTime() - 1)).puzzle,
      undefined,
    )
    assert.ok(a.crosswordView(state, undefined, false, now).puzzle)
    assert.equal(a.submitCrossword(state, 'Anna', answers, now), true)
    assert.equal(a.submitCrossword(state, 'Emil', answers, now), true)
    await a.settleCrosswordWinner(state)
    await a.settleCrosswordWinner(state)
    await a.settleCrosswordCompletion(state, 'Anna')
    await a.settleCrosswordCompletion(state, 'Emil')
    await a.settleCrosswordCompletion(state, 'Emil')
    assert.equal((await a.readEconomy('Anna')).balance, 1000)
    assert.equal((await a.readEconomy('Emil')).balance, 50)
    assert.equal((await a.readCrossword('marvel')).winner, null)
    assert.equal((await a.readCrossword()).winner, null)
  })
