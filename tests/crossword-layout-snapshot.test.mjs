import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import test from 'node:test'
import ts from 'typescript'

const snapshot = 'docs/designs/crossword/snapshots/2026-11-11-wall-free-v1'
function entries(file) {
  const exports = {}
  vm.runInNewContext(
    ts.transpileModule(readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    { exports },
  )
  return exports.CROSSWORD_PREVIEW
}
function stats(words) {
  const owners = new Map()
  const parents = words.map((_, index) => index)
  const degree = words.map(() => 0)
  const root = (index) =>
    parents[index] === index ? index : (parents[index] = root(parents[index]))
  let crossings = 0
  for (let index = 0; index < words.length; index++) {
    const word = words[index]
    for (let i = 0; i < word.answer.length; i++) {
      const cell = `${word.row + (word.down ? i : 0)}:${word.col + (word.down ? 0 : i)}`
      if (owners.has(cell)) {
        const other = owners.get(cell)
        parents[root(index)] = root(other)
        degree[index]++
        degree[other]++
        crossings++
      } else owners.set(cell, index)
    }
  }
  return {
    crossings,
    groups: new Set(words.map((_, i) => root(i))).size,
    alone: degree.filter((n) => !n).length,
  }
}

test('the original wall-free snapshot remains complete and byte-for-byte restorable', () => {
  const manifest = JSON.parse(readFileSync(`${snapshot}/manifest.json`, 'utf8'))
  assert.equal(manifest.words, 61)
  for (const file of manifest.files)
    assert.equal(
      createHash('sha256')
        .update(readFileSync(`${snapshot}/${file.file}`))
        .digest('hex'),
      file.sha256,
      file.file,
    )
})

test('new layout preserves all answers and has more crossings and fewer disconnected groups', () => {
  const before = entries(`${snapshot}/server/data/crossword.ts`)
  const after = entries('server/data/crossword.ts')
  const answers = new Set(Array.from(after, (entry) => entry.answer))
  for (const entry of before) assert.ok(answers.has(entry.answer), entry.answer)
  assert.equal(after.length, 104)
  const oldStats = stats(before)
  const newStats = stats(after)
  assert.ok(newStats.crossings > oldStats.crossings)
  assert.equal(newStats.groups, 1)
  assert.equal(newStats.alone, 0)
})
