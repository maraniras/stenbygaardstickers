import assert from 'node:assert/strict'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'
import { readFileSync } from 'node:fs'

const flush = () => new Promise(setImmediate)
function client(reduced = false) {
  const exports = {},
    bursts = [],
    timers = []
  const confetti = (options) => {
    let finish
    const promise = reduced
      ? null
      : new Promise((resolve) => {
          finish = resolve
        })
    bursts.push({ options, finish })
    return promise
  }
  vm.runInNewContext(
    ts.transpileModule(readFileSync('app/composables/useConfetti.ts', 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    { exports, require: () => ({ default: confetti }), setTimeout: (fn) => timers.push(fn) },
  )
  return { ...exports, bursts, timers }
}

test('waiting for confetti includes the initial burst and both delayed side bursts', async () => {
  const c = client()
  let completed = false
  const done = c.shootConfetti('normal', true).then(() => {
    completed = true
  })
  await flush()
  assert.equal(c.bursts.length, 1)
  assert.equal(completed, false)
  c.timers[0]()
  assert.equal(c.bursts.length, 3)
  c.bursts[0].finish()
  c.bursts[1].finish()
  await flush()
  assert.equal(completed, false)
  c.bursts[2].finish()
  await done
  assert.equal(completed, true)
})

test('default callers remain non-blocking and reduced motion completes safely', async () => {
  const normal = client()
  await normal.shootConfetti()
  assert.equal(normal.bursts.length, 1)
  normal.timers[0]()
  normal.bursts.forEach((burst) => burst.finish())
  const reduced = client(true)
  const done = reduced.shootConfetti('normal', true)
  await flush()
  reduced.timers[0]()
  await done
  assert.ok(reduced.bursts.every((burst) => burst.options.disableForReducedMotion))
})
