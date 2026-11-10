import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

function load(path, dependencies = {}) {
  const exports = {}
  vm.runInNewContext(
    ts.transpileModule(readFileSync(path, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText,
    { exports, require: (id) => dependencies[id], Date, Intl },
  )
  return exports
}
const { adventPresentation } = load('shared/utils/advent.ts', {
  './game-day': load('shared/utils/game-day.ts'),
})

test('calendar teaser starts November24 and access starts December1 at04 Danish time', () => {
  for (const [stamp, visible, open] of [
    ['2026-11-19T12:00:00Z', false, false],
    ['2026-11-20T02:59:59Z', false, false],
    ['2026-11-20T03:00:00Z', false, false],
    ['2026-11-24T02:59:59Z', false, false],
    ['2026-11-24T03:00:00Z', true, false],
    ['2026-12-01T02:59:59Z', true, false],
    ['2026-12-01T03:00:00Z', true, true],
    ['2026-12-24T12:00:00Z', true, true],
    ['2026-12-31T22:59:59Z', true, true],
    ['2026-12-31T23:00:00Z', false, false],
    ['2027-01-01T03:00:00Z', false, false],
    ['2027-11-24T03:00:00Z', true, false],
  ]) {
    const result = adventPresentation(new Date(stamp))
    assert.equal(result.visible, visible, stamp)
    assert.equal(result.open, open, stamp)
  }
})
