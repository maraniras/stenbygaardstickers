import assert from 'node:assert/strict'
import test from 'node:test'
import vm from 'node:vm'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { ref, reactive, watch, effectScope, nextTick } from 'vue'
const transpile = (source) =>
  ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
function presentation(reduced = false) {
  const exports = {},
    timers = [],
    unmount = [],
    states = new Map()
  vm.runInNewContext(transpile(readFileSync('app/composables/useSlotPresentation.ts', 'utf8')), {
    exports,
    require: () => ({
      SLOT_SYMBOLS: [
        'lemon',
        'strawberry',
        'mix-max',
        'faxe-kondi',
        'crowned-banana',
        'banana-peel',
        'banana-leaf',
      ].map((id) => ({ id })),
    }),
    ref,
    useState: (key) => {
      if (!states.has(key)) states.set(key, ref(false))
      return states.get(key)
    },
    onBeforeUnmount: (fn) => unmount.push(fn),
    window: { matchMedia: () => ({ matches: reduced }) },
    setTimeout: (fn, ms) => {
      const t = { fn, ms, cancelled: false }
      timers.push(t)
      return t
    },
    clearTimeout: (t) => {
      if (t) t.cancelled = true
    },
  })
  return {
    ...exports.useSlotPresentation(),
    timers,
    states,
    unmount: () => unmount.forEach((fn) => fn()),
    durations: exports.SLOT_STOP_MS,
  }
}
const spin = {
  id: 'spin-1',
  sequence: 1,
  bet: 10,
  payout: 1000,
  multiplier: 100,
  reels: ['crowned-banana', 'crowned-banana', 'crowned-banana'],
}
test('reels stop in order and only reveal the result after the last reel; reloads do not animate', async () => {
  const a = presentation(),
    promise = a.present(spin, true)
  assert.deepEqual(Array.from(a.durations), [2800, 3300, 3800])
  assert.equal(a.rolling.value, true)
  assert.equal(a.states.get('slot-animation').value, true)
  assert.equal(a.result.value, null)
  assert.deepEqual(Array.from(a.positions.value), [53, 53, 53])
  a.timers[0].fn()
  assert.equal(await promise, true)
  assert.equal(a.result.value.id, 'spin-1')
  assert.equal(a.rolling.value, false)
  assert.deepEqual(Array.from(a.positions.value), [11, 11, 11])
  await a.present(spin, false)
  assert.equal(a.timers.length, 1)
})
test('account reset and unmount cancel pending results and reduced motion skips animation', async () => {
  for (const action of ['reset', 'unmount']) {
    const a = presentation(),
      promise = a.present(spin, true)
    a[action]()
    assert.equal(await promise, false)
    assert.equal(a.timers[0].cancelled, true)
    assert.equal(a.result.value, null)
    assert.equal(a.states.get('slot-animation').value, false)
  }
  const a = presentation(true)
  assert.equal(await a.present(spin, true), true)
  assert.equal(a.timers.length, 0)
  assert.equal(a.result.value.id, 'spin-1')
})

function lever() {
  const props = reactive({ disabled: false }),
    scope = effectScope()
  let spins = 0
  const context = vm.createContext({
    ref,
    watch,
    defineProps: () => props,
    defineEmits: () => () => {
      spins++
      props.disabled = true
    },
  })
  const source = readFileSync('app/components/SlotLever.vue', 'utf8').match(
    /<script setup lang="ts">([\s\S]*?)<\/script>/,
  )[1]
  scope.run(() =>
    vm.runInContext(transpile(source) + '\nglobalThis.api={down,move,end,click,pull};', context),
  )
  const event = (y, extra = {}) => ({
    pointerId: 1,
    isPrimary: true,
    button: 0,
    clientY: y,
    currentTarget: { setPointerCapture: () => {} },
    ...extra,
  })
  return { ...context.api, props, event, spins: () => spins, stop: () => scope.stop() }
}
test('lever supports tap, keyboard and a deliberate pull without double spins', async () => {
  for (const mode of ['tap', 'keyboard', 'pull']) {
    const a = lever()
    if (mode !== 'keyboard') {
      a.down(a.event(10))
      a.move(a.event(mode === 'pull' ? 55 : 10))
      a.end(a.event(mode === 'pull' ? 55 : 10))
    }
    a.click({ detail: mode === 'keyboard' ? 0 : 1 })
    a.click({ detail: 1 })
    assert.equal(a.spins(), 1)
    a.props.disabled = false
    await nextTick()
    a.click({ detail: 0 })
    assert.equal(a.spins(), 2)
    a.stop()
  }
})
test('cancelled pulls, secondary fingers and disabled controls never emit a spin', () => {
  for (const mode of ['cancel', 'secondary', 'disabled']) {
    const a = lever()
    if (mode === 'disabled') a.props.disabled = true
    const event = a.event(10, mode === 'secondary' ? { isPrimary: false } : {})
    a.down(event)
    a.move(a.event(65))
    a.end(a.event(65), mode === 'cancel')
    assert.equal(a.spins(), 0)
    a.stop()
  }
})
