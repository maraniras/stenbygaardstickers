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
  assert.equal(width, 28)
  assert.equal(height, 30)
  const expected = JSON.parse(readFileSync('docs/designs/crossword/word-list.json', 'utf8')).map(
    (entry) => (entry.answer === 'SKAGEN' ? 'RTABEN' : entry.answer),
  )
  assert.equal(entries.find((entry) => entry.answer === 'IDA').clue, 'Yapper')
  assert.equal(entries.find((entry) => entry.answer === 'DYRT').clue, 'Ironman')
  assert.ok(!entries.some((entry) => entry.answer === 'IR' || entry.clue === 'Grønt på kobber'))
  for (const excluded of ['IR', 'TED', 'GRINE', 'DAMP'])
    assert.ok(!entries.some((entry) => entry.answer === excluded), excluded)
  const additions = [
    { clue: 'Håndtegn', answer: 'OK', row: 14, col: 12, down: true },
    { clue: 'Tid', answer: 'ÅR', row: 7, col: 4, down: true },
    { clue: 'Os', answer: 'VI', row: 26, col: 6, down: false },
    { clue: 'Før race', answer: 'TAPER', row: 1, col: 22, down: false },
    { clue: 'Træls løbeforhold', answer: 'SNE', row: 12, col: 10, down: false },
    { clue: 'Svømmeudstyr', answer: 'BIKINI', row: 25, col: 1, down: false },
    { clue: 'Det hele', answer: 'ALT', row: 27, col: 15, down: true },
    { clue: 'Efter work', answer: 'FRI', row: 18, col: 24, down: false },
    { clue: 'Pæn', answer: 'FIN', row: 16, col: 16, down: false },
    { clue: 'Chat', answer: 'AI', row: 15, col: 17, down: true },
    { clue: 'Slås', answer: 'KAMP', row: 22, col: 8, down: true },
    { clue: 'WC', answer: 'LORT', row: 11, col: 16, down: true },
    { clue: 'Nej', answer: 'NIKS', row: 3, col: 17, down: true },
    { clue: 'Jack', answer: 'ASS', row: 6, col: 15, down: false },
    { clue: 'Dyt', answer: 'BÅT', row: 14, col: 14, down: false },
  ]
  for (const expectedEntry of additions) {
    const actualEntry = entries.find((entry) => entry.answer === expectedEntry.answer)
    assert.ok(actualEntry, expectedEntry.answer)
    for (const field of ['clue', 'row', 'col', 'down'])
      assert.equal(actualEntry[field], expectedEntry[field], expectedEntry.answer + ': ' + field)
  }
  const ni = entries.find((entry) => entry.answer === 'NI')
  const iconic = entries.find((entry) => entry.answer === 'IKONISK')
  assert.equal(ni.clue, '<10')
  assert.equal(ni.down, true)
  assert.equal(ni.row + 1, iconic.row)
  assert.equal(ni.col, iconic.col + iconic.answer.lastIndexOf('I'))
  for (const expectedEntry of [
    { clue: '4. år', answer: 'OL', row: 9, col: 6, down: true },
    { clue: '....mand', answer: 'JERN', row: 8, col: 2, down: false },
  ]) {
    const actualEntry = entries.find((entry) => entry.answer === expectedEntry.answer)
    assert.ok(actualEntry, expectedEntry.answer)
    for (const field of ['clue', 'row', 'col', 'down'])
      assert.equal(actualEntry[field], expectedEntry[field], expectedEntry.answer + ': ' + field)
  }
  for (const expectedEntry of [
    { clue: 'Tomt', answer: 'ØDE', row: 17, col: 1, down: false },
    { clue: 'Købekraft', answer: 'PENGE', row: 19, col: 1, down: true },
    { clue: '.... smart', answer: 'KARL', row: 15, col: 12, down: false },
    { clue: 'Vand slange', answer: 'ÅL', row: 14, col: 15, down: true },
  ]) {
    const actualEntry = entries.find((entry) => entry.answer === expectedEntry.answer)
    assert.ok(actualEntry, expectedEntry.answer)
    for (const field of ['clue', 'row', 'col', 'down'])
      assert.equal(actualEntry[field], expectedEntry[field], expectedEntry.answer + ': ' + field)
  }
  assert.equal(entries.length, 104)
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
  assert.equal(entries.filter((entry) => entry.image?.width === 1).length, 4)
  assert.equal(entries.filter((entry) => entry.image?.width > 1).length, 2)
})
