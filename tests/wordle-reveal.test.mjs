import assert from 'node:assert/strict'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'
import { readFileSync } from 'node:fs'
import { ref, watch, effectScope, onScopeDispose, nextTick } from 'vue'

const empty = () => ({ guesses: [], marks: [], won: false, finished: false, reward: 0 })
const win = () => ({
  guesses: ['BANAN'],
  marks: [Array(5).fill('correct')],
  won: true,
  finished: true,
  reward: 50,
  answer: 'BANAN',
})
const flush = () => new Promise(setImmediate)
function client(initial = empty(), celebrate) {
  const source = ref(initial),
    identity = ref('Test:2026-11-16'),
    scope = effectScope()
  const timers = new Map(),
    exports = {}
  const notificationLock = ref(false)
  let id = 0,
    wins = 0
  vm.runInNewContext(
    ts.transpileModule(readFileSync('app/composables/useWordleReveal.ts', 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    {
      exports,
      ref,
      watch,
      onScopeDispose,
      nextTick,
      useState: () => notificationLock,
      setTimeout: (fn, ms) => {
        const key = ++id
        timers.set(key, { fn, ms })
        return key
      },
      clearTimeout: (key) => timers.delete(key),
    },
  )
  const c = scope.run(() =>
    exports.useWordleReveal(source, identity, () => {
      wins++
      return celebrate?.()
    }),
  )
  return {
    ...c,
    source,
    identity,
    scope,
    timers,
    notificationLock,
    wins: () => wins,
    step: async () => {
      const [key, timer] = timers.entries().next().value
      timers.delete(key)
      timer.fn()
      await flush()
      return timer.ms
    },
  }
}

test('each tile reveals at its midpoint; result, keyboard and celebration wait for the whole row', async () => {
  const c = client()
  c.expectReveal('BANAN')
  assert.equal(c.notificationLock.value, true, 'block before the server can publish badges')
  c.source.value = win()
  await nextTick()
  assert.equal(c.animating.value, true)
  assert.equal(c.shown.value.finished, false)
  assert.equal(c.shown.value.answer, undefined)
  for (let col = 0; col < 5; col++) {
    assert.equal(c.flipping.value, col)
    assert.equal(c.shown.value.marks[0].length, col)
    assert.equal(c.keyboard.value.guesses.length, 0)
    assert.equal(c.wins(), 0)
    assert.equal(c.notificationLock.value, true)
    assert.equal(await c.step(), 200)
    assert.equal(c.shown.value.marks[0][col], 'correct')
    assert.equal(await c.step(), 220)
  }
  assert.equal(c.animating.value, false)
  assert.equal(c.flipping.value, null)
  assert.equal(c.shown.value.finished, true)
  assert.equal(c.shown.value.reward, 50)
  assert.equal(c.keyboard.value.guesses.length, 1)
  assert.equal(c.wins(), 1)
  assert.equal(c.notificationLock.value, false)
  c.scope.stop()
})

test('reload restores results without replay; account/day change and unmount cancel pending reveals', async () => {
  const restored = client(win())
  assert.equal(restored.animating.value, false)
  assert.equal(restored.wins(), 0)
  restored.scope.stop()
  for (const action of ['identity', 'unmount']) {
    const c = client()
    c.expectReveal('BANAN')
    c.source.value = win()
    await nextTick()
    if (action === 'identity') {
      c.identity.value = 'Other:2026-11-17'
      c.source.value = empty()
      await nextTick()
    } else c.scope.stop()
    await flush()
    assert.equal(c.animating.value, false)
    assert.equal(c.timers.size, 0, action)
    assert.equal(c.wins(), 0)
    assert.equal(c.notificationLock.value, false)
    if (action === 'identity') {
      assert.equal(c.shown.value.guesses.length, 0)
      c.scope.stop()
    }
  }
})

test('background same-count refresh preserves pending animation and disarm prevents stale replay', async () => {
  const c = client()
  c.expectReveal('BANAN')
  c.source.value = empty()
  await nextTick()
  c.source.value = win()
  await nextTick()
  assert.equal(c.animating.value, true)
  c.scope.stop()
  const rejected = client()
  rejected.expectReveal('BANAN')
  rejected.disarm()
  assert.equal(rejected.notificationLock.value, false)
  rejected.source.value = win()
  await nextTick()
  assert.equal(rejected.animating.value, false)
  assert.equal(rejected.wins(), 0)
  rejected.scope.stop()
})

test('badge lock waits for celebration completion and survives a same-result refresh', async () => {
  let finish
  const celebration = new Promise((resolve) => {
    finish = resolve
  })
  const c = client(empty(), () => celebration)
  c.expectReveal('BANAN')
  c.source.value = win()
  await nextTick()
  for (let i = 0; i < 10; i++) await c.step()
  assert.equal(c.animating.value, false)
  assert.equal(c.shown.value.finished, true)
  assert.equal(c.notificationLock.value, true, 'confetti is still running')
  c.source.value = win()
  await nextTick()
  assert.equal(c.notificationLock.value, true)
  finish()
  await flush()
  assert.equal(c.notificationLock.value, false)
  c.scope.stop()
})

test('a failed celebration and leaving during confetti both release the popup lock', async () => {
  for (const exit of ['failure', 'unmount', 'identity']) {
    let finish
    const c = client(empty(), () =>
      exit === 'failure'
        ? Promise.reject(Error('optional visual failed'))
        : new Promise((resolve) => {
            finish = resolve
          }),
    )
    c.expectReveal('BANAN')
    c.source.value = win()
    await nextTick()
    for (let i = 0; i < 10; i++) await c.step()
    if (exit === 'unmount') c.scope.stop()
    if (exit === 'identity') {
      c.identity.value = 'Other:2026-11-17'
      c.source.value = empty()
      await nextTick()
    }
    assert.equal(c.notificationLock.value, false)
    finish?.()
    await flush()
    c.scope.stop()
  }
})
