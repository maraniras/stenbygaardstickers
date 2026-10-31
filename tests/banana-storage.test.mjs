import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'

const exports = {}
vm.runInNewContext(
  ts.transpileModule(readFileSync('app/utils/bananaStorage.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText,
  { exports },
)
const { bananaStorage, BANANA_STORAGE_STAGES } = exports

test('warehouse grows across all stages without unbounded rendering or imaginary bananas', () => {
  let count = 0
  for (const amount of [
    0, 1, 249, 250, 999, 1000, 2499, 2500, 4999, 5000, 9999, 10000, 24999, 25000, 50000, 100000,
    250000, 1000000000,
  ]) {
    const s = bananaStorage(amount)
    assert.ok(s.count >= count && s.count <= 110)
    count = s.count
    assert.equal(s.crates.flatMap((c) => c.bananas).length + s.loose.length, s.count)
    assert.ok(s.progress >= 0 && s.progress <= 1)
    for (const b of [...s.loose, ...s.crates.flatMap((c) => c.bananas)])
      assert.ok([b.x, b.y, b.angle].every(Number.isFinite))
  }
  assert.equal(bananaStorage(0).count, 0)
  for (const stage of BANANA_STORAGE_STAGES)
    assert.equal(bananaStorage(stage.at).stage.name, stage.name)
})
test('storage follows current balance, shrinks after spending and handles invalid values', () => {
  assert.ok(bananaStorage(50000).count > bananaStorage(250).count)
  assert.equal(bananaStorage(-10).amount, 0)
  assert.equal(bananaStorage(NaN).amount, 0)
  assert.equal(bananaStorage(Infinity).amount, 0)
  assert.equal(bananaStorage(250.9).amount, 250)
  assert.equal(bananaStorage(250000).next, undefined)
})
