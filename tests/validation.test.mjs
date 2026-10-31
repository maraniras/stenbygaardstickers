import assert from 'node:assert/strict'
import test from 'node:test'
import vm from 'node:vm'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
const compile = (path) =>
  ts.transpileModule(readFileSync(path, 'utf8').replaceAll('import.meta.dev', 'true'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText
const validation = {}
vm.runInNewContext(compile('shared/utils/validation.ts'), { exports: validation })
const stickers = {}
vm.runInNewContext(compile('server/utils/stickers.ts'), {
  exports: stickers,
  require: () => validation,
  process: { env: {} },
  isOwnMedia: () => true,
  createError: (value) => Object.assign(Error(value.statusMessage), value),
})
const valid = () => ({
  title: 'Test',
  date: '2026-10-31',
  lat: 54.3,
  lng: 18.6,
  placedBy: ['Nicole'],
  media: [],
})
test('calendar dates and numeric coordinate types are strictly validated', () => {
  for (const date of ['2026-02-29', '2026-02-31', '2026-13-01', '2026-10-31extra'])
    assert.throws(() => stickers.cleanInput({ ...valid(), date }))
  assert.equal(stickers.cleanInput({ ...valid(), date: '2028-02-29' }).date, '2028-02-29')
  for (const lat of [null, '', false, '54.3', NaN, Infinity, 91])
    assert.throws(() => stickers.cleanInput({ ...valid(), lat }))
  assert.equal(stickers.cleanInput({ ...valid(), lat: 0, lng: 0 }).lat, 0)
})
test('sticker names share account normalization, limits and case-insensitive deduplication', () => {
  for (const placedBy of [[], ['a'.repeat(31)], ['123'], ['Nicole', ''], Array(13).fill('Nicole')])
    assert.throws(() => stickers.cleanInput({ ...valid(), placedBy }))
  const names = stickers.cleanInput({
    ...valid(),
    placedBy: [' Nicole ', 'nicole', '  Ole   Sørensen '],
  }).placedBy
  assert.equal(names.length, 2)
  assert.equal(names[1], 'Ole Sørensen')
})
