import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import vm from 'node:vm'
import test from 'node:test'
import ts from 'typescript'

test('user crossword includes every supplied answer with consistent crossings and picture clues', () => {
  const exports = {}
  vm.runInNewContext(
    ts.transpileModule(readFileSync('server/data/crossword.ts', 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText,
    { exports },
  )
  const { CROSSWORD_PREVIEW: entries, CROSSWORD_COLUMNS: width, CROSSWORD_ROWS: height } = exports
  const letters = new Map()
  const clues = new Set()
  const pictures = new Set()
  const key = (r, c) => `${r}:${c}`
  assert.equal(width, 24)
  assert.equal(height, 28)
  const expected = JSON.parse(readFileSync('docs/designs/crossword/word-list.json', 'utf8')).map(
    (entry) => (entry.answer === 'SKAGEN' ? 'RTABEN' : entry.answer),
  )
  assert.equal(entries.length, 61)
  assert.deepEqual(Array.from(entries, (entry) => entry.answer).sort(), expected.sort())
  for (const entry of entries) {
    assert.match(entry.answer, /^[A-ZÆØÅ]+$/)
    if (entry.image) {
      const image = entry.image
      assert.ok(existsSync(`public${image.src}`), image.src)
      for (let r = image.row; r < image.row + image.height; r++)
        for (let c = image.col; c < image.col + image.width; c++) {
          assert.ok(r >= 0 && r < height && c >= 0 && c < width)
          assert.ok(!pictures.has(key(r, c)), 'Pictures must not overlap')
          pictures.add(key(r, c))
        }
    } else {
      const clue = key(entry.row - (entry.down ? 1 : 0), entry.col - (entry.down ? 0 : 1))
      assert.ok(!clues.has(clue), 'Each text clue needs its own square')
      clues.add(clue)
    }
    for (const [i, letter] of [...entry.answer].entries()) {
      const r = entry.row + (entry.down ? i : 0)
      const c = entry.col + (entry.down ? 0 : i)
      assert.ok(r >= 0 && r < height && c >= 0 && c < width)
      const cell = key(r, c)
      if (letters.has(cell)) assert.equal(letters.get(cell), letter, `Crossing at ${cell}`)
      letters.set(cell, letter)
    }
  }
  for (const cell of letters.keys()) {
    assert.ok(!clues.has(cell), `Answer under text clue at ${cell}`)
    assert.ok(!pictures.has(cell), `Answer under image at ${cell}`)
  }
  for (const cell of clues) assert.ok(!pictures.has(cell), `Text clue under image at ${cell}`)
  assert.equal(entries.filter((entry) => entry.image?.width === 1).length, 3)
  assert.equal(entries.filter((entry) => entry.image?.width > 1).length, 2)
})
