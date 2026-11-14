import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import test from 'node:test'
import ts from 'typescript'

test('every uninterrupted answer run has a real clue, without needing separating bars', () => {
  const data = {}
  vm.runInNewContext(
    ts.transpileModule(readFileSync('server/data/crossword.ts', 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    { exports: data },
  )
  const entries = data.CROSSWORD_PREVIEW
  const cells = new Map()
  const key = (row, col) => `${row}:${col}`
  const expected = new Map()
  for (const entry of entries) {
    expected.set(`${entry.row}:${entry.col}:${entry.down}`, entry.answer)
    for (let i = 0; i < entry.answer.length; i++)
      cells.set(
        key(entry.row + (entry.down ? i : 0), entry.col + (entry.down ? 0 : i)),
        entry.answer[i],
      )
  }
  const found = new Set()
  for (const cell of cells.keys()) {
    const [row, col] = cell.split(':').map(Number)
    for (const down of [false, true]) {
      if (cells.has(key(row - (down ? 1 : 0), col - (down ? 0 : 1)))) continue
      let answer = '',
        step = 0
      while (cells.has(key(row + (down ? step : 0), col + (down ? 0 : step)))) {
        answer += cells.get(key(row + (down ? step : 0), col + (down ? 0 : step)))
        step++
      }
      if (answer.length < 2) continue
      const run = `${row}:${col}:${down}`
      assert.equal(
        answer,
        expected.get(run),
        `Unclued or accidentally merged ${down ? 'vertical' : 'horizontal'} run at ${row}:${col}: ${answer}`,
      )
      found.add(run)
    }
  }
  assert.equal(
    found.size,
    entries.length,
    'Every supplied answer occupies its entire uninterrupted run',
  )
  const board = readFileSync('app/components/CrosswordBoard.vue', 'utf8')
  assert.ok(!board.includes('bar-right'))
  assert.ok(!board.includes('bar-bottom'))
  assert.ok(!board.includes('crosswordBorders'))
})
