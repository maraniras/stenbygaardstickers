import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

for (const [file, planner] of [
  ['crossword-push', 'checkCrosswordPushSchedule'],
  ['seasonal-push', 'checkSeasonalPushSchedule'],
]) {
  test(`${file} keeps the request alive until scheduling finishes without platform background support`, async () => {
    let hook
    let finish
    const pending = new Promise((resolve) => {
      finish = resolve
    })
    const context = {
      exports: {},
      defineNitroPlugin: (plugin) => plugin,
      [planner]: () => pending,
    }
    vm.runInNewContext(
      ts.transpileModule(readFileSync(`server/plugins/${file}.ts`, 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS },
      }).outputText,
      context,
    )
    context.exports.default({
      hooks: {
        hook: (name, callback) => {
          assert.equal(name, 'request')
          hook = callback
        },
      },
    })
    let completed = false
    const request = hook({ waitUntil() {} }).then(() => {
      completed = true
    })
    await Promise.resolve()
    await Promise.resolve()
    assert.equal(completed, false)
    finish()
    await request
    assert.equal(completed, true)
  })
}
