import assert from 'node:assert/strict'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'
import { readFileSync } from 'node:fs'
import { ref, watch, nextTick, effectScope, computed } from 'vue'

const day = '2026-11-08'
const result = {
  choices: [0, 2, 5],
  prizes: [
    { kind: 'bananas', amount: 100 },
    { kind: 'elf', amount: -25 },
    { kind: 'nit', amount: 0 },
  ],
  nominal: 75,
  amount: 75,
}
const flush = () => new Promise(setImmediate)
function client() {
  const state = ref({ day, wallet: { balance: 250 }, boxes: null, boxesActive: true }),
    name = ref('Mathias')
  const animation = ref(false),
    events = [],
    timers = [],
    scope = effectScope()
  let answer,
    fail,
    reloads = 0,
    teardown,
    stored
  const exports = {}
  scope.run(() =>
    vm.runInNewContext(
      ts.transpileModule(readFileSync('app/composables/useDailyBoxes.ts', 'utf8'), {
        compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
      }).outputText,
      {
        exports,
        ref,
        computed,
        watch,
        nextTick,
        useUser: () => ({ name, ready: ref(true) }),
        userToken: () => `token:${name.value}`,
        useState: () => animation,
        useEconomy: () => ({
          state,
          error: ref(''),
          reload: async () => {
            reloads++
            if (stored) state.value = stored
          },
          openBoxes: (choices) => {
            events.push([...choices])
            const owner = name.value
            return new Promise((resolve, reject) => {
              answer = (response) => {
                if (name.value === owner) state.value = response
                resolve(response)
              }
              fail = reject
            })
          },
        }),
        onBeforeUnmount: (fn) => {
          teardown = fn
        },
        window: { matchMedia: () => ({ matches: false }) },
        shootConfetti: async () => {},
        setTimeout(fn) {
          const timer = { fn, cancelled: false }
          timers.push(timer)
          return timer
        },
        clearTimeout(timer) {
          timer.cancelled = true
        },
      },
    ),
  )
  const api = scope.run(() => exports.useDailyBoxes())
  return {
    ...api,
    animation,
    events,
    timers,
    name,
    state,
    answer: (boxes = result) => answer({ day, wallet: { balance: 325 }, boxes, boxesActive: true }),
    reject: (recover) => {
      stored = recover
        ? { day, wallet: { balance: 325 }, boxes: result, boxesActive: true }
        : undefined
      fail(Error('Network'))
    },
    get reloads() {
      return reloads
    },
    finish: () => timers.filter((timer) => !timer.cancelled).forEach((timer) => timer.fn()),
    close: () => {
      teardown()
      scope.stop()
    },
  }
}
function pickThree(c) {
  for (const index of [0, 2, 5]) c.toggle(index)
}

test('three boxes reveal together and the displayed balance waits until the flip finishes', async () => {
  const c = client()
  pickThree(c)
  c.toggle(8)
  assert.deepEqual(Array.from(c.selected.value), [0, 2, 5])
  const play = c.play()
  await c.play()
  assert.equal(c.events.length, 1)
  assert.equal(c.animation.value, true)
  c.answer()
  await flush()
  assert.equal(c.flipped.value, true)
  assert.equal(c.resultVisible.value, false)
  assert.equal(c.balance.value, 250)
  c.finish()
  await play
  assert.equal(c.resultVisible.value, true)
  assert.equal(c.balance.value, 325)
  assert.equal(c.animation.value, false)
  await c.play()
  assert.equal(c.events.length, 1)
  c.close()
})

test('choices can be changed before committing and authoritative choices from another device win', async () => {
  const c = client()
  pickThree(c)
  c.toggle(2)
  c.toggle(3)
  assert.deepEqual(Array.from(c.selected.value), [0, 5, 3])
  const play = c.play()
  c.answer({ ...result, choices: [7, 8, 9] })
  await flush()
  assert.deepEqual(Array.from(c.selected.value), [7, 8, 9])
  c.finish()
  await play
  c.close()
})

test('switching account during a request discards its late result and cancels animation', async () => {
  const c = client()
  pickThree(c)
  const play = c.play()
  c.name.value = 'Nicole'
  c.state.value = null
  await nextTick()
  c.answer()
  await play
  assert.equal(c.run.value, null)
  assert.equal(c.balance.value, null)
  assert.equal(c.resultVisible.value, false)
  assert.equal(c.animation.value, false)
  c.close()
})

test('04:00 rollover cancels the old flip without flashing yesterday’s result', async () => {
  const c = client()
  pickThree(c)
  const play = c.play()
  c.answer()
  await flush()
  c.state.value = { day: '2026-11-09', wallet: { balance: 325 }, boxes: null, boxesActive: true }
  await nextTick()
  await play
  assert.equal(c.run.value, null)
  assert.equal(c.flipped.value, false)
  assert.equal(c.animation.value, false)
  c.finish()
  assert.equal(c.resultVisible.value, false)
  c.close()
})

test('a lost POST response reloads a committed result without submitting another selection', async () => {
  const c = client()
  pickThree(c)
  const play = c.play()
  c.reject(true)
  await play
  await nextTick()
  assert.equal(c.reloads, 1)
  assert.equal(c.events.length, 1)
  assert.equal(c.resultVisible.value, true)
  assert.equal(c.balance.value, 325)
  assert.equal(c.error.value, '')
  c.close()
})

test('outside the Christmas season boxes cannot be selected or submitted', async () => {
  const c = client()
  c.state.value = { ...c.state.value, boxesActive: false }
  await nextTick()
  pickThree(c)
  assert.equal(c.selected.value.length, 0)
  await c.play()
  assert.equal(c.events.length, 0)
  c.close()
})

test('season closure at midnight cancels an ongoing flip even while the game day is unchanged', async () => {
  const c = client()
  pickThree(c)
  const play = c.play()
  c.answer()
  await flush()
  c.state.value = { ...c.state.value, boxesActive: false }
  await nextTick()
  await play
  assert.equal(c.busy.value, false)
  assert.equal(c.animation.value, false)
  assert.equal(c.active.value, false)
  c.close()
})
