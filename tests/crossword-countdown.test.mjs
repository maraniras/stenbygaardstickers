import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import test from 'node:test'
import ts from 'typescript'

const context = { exports: {} }
vm.runInNewContext(
  ts.transpileModule(readFileSync('app/utils/crosswordCountdown.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText,
  context,
)
const { crosswordCountdown } = context.exports
const opening = '2026-11-20T19:00:00.000Z'
const at = Date.parse(opening)
const hour = 3600000

test('crossword countdown starts exactly 48 hours before the scheduled instant', () => {
  assert.equal(crosswordCountdown(opening, at - 48 * hour - 1), null)
  assert.equal(crosswordCountdown(opening, at - 48 * hour), '48:00:00')
  assert.equal(crosswordCountdown(opening, at - 48 * hour + 1000), '47:59:59')
  assert.equal(crosswordCountdown(opening, at - 24 * hour), '24:00:00')
  assert.equal(crosswordCountdown(opening, at - 1001), '00:00:02')
  assert.equal(crosswordCountdown(opening, at - 1), '00:00:01')
})

test('countdown is absent without a schedule and disappears at opening', () => {
  for (const value of [null, undefined, '', 'invalid'])
    assert.equal(crosswordCountdown(value, at), null)
  assert.equal(crosswordCountdown(opening, at), null)
  assert.equal(crosswordCountdown(opening, at + 1), null)
  assert.equal(crosswordCountdown(opening, NaN), null)
})

test('countdown uses the selected instant across timezone offsets and DST', () => {
  assert.equal(crosswordCountdown('2026-11-20T20:00:00+01:00', at - hour), '01:00:00')
  assert.equal(
    crosswordCountdown('2026-10-25T04:00:00+01:00', Date.parse('2026-10-23T05:00:00+02:00')),
    '48:00:00',
  )
})
