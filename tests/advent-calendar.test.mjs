import assert from 'node:assert/strict'
import test from 'node:test'
import vm from 'node:vm'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { ref, computed, nextTick } from 'vue'

function calendar(reduced = false) {
  const timers = [],
    unmount = []
  const source = readFileSync('app/pages/spil/julekalender.vue', 'utf8').match(
    /<script setup lang="ts">([\s\S]*?)<\/script>/,
  )[1]
  const code = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText
  const dayExports = {}
  vm.runInNewContext(
    ts.transpileModule(readFileSync('shared/utils/game-day.ts', 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText,
    { exports: dayExports },
  )
  const context = vm.createContext({
    exports: {},
    require: () => dayExports,
    watch() {},
    useAdventRewards: () => ({
      state: ref(null),
      name: ref('Test'),
      loading: ref(false),
      claiming: ref(false),
      error: ref(''),
      testMode: ref(true),
      previewAllowed: ref(true),
      refresh() {},
      claim: async () => false,
      refreshBalance() {},
    }),
    ref,
    computed,
    nextTick,
    useHead() {},
    onMounted() {},
    onBeforeUnmount: (fn) => unmount.push(fn),
    window: { matchMedia: () => ({ matches: reduced }) },
    setTimeout(fn, ms) {
      const t = { fn, ms, cancelled: false }
      timers.push(t)
      return t
    },
    clearTimeout(t) {
      if (t) t.cancelled = true
    },
    clearInterval() {},
  })
  vm.runInContext(
    code +
      '\nglobalThis.api={days,opened,selected,phase,autoplay,today,currentDate,viewport,scene,transform,reveal,reset,playAll,openDay,backgroundImage,surfaces,artwork,measureSurfaces,surfaceStyle,overview,torn};',
    context,
  )
  const a = context.api
  a.viewport.value = { getBoundingClientRect: () => ({ left: 0, top: 0, width: 360, height: 560 }) }
  a.scene.value = {
    querySelector: () => ({
      getBoundingClientRect: () => ({ left: 60, top: 120, width: 60, height: 60 }),
    }),
  }
  const tick = async () => {
    const t = timers.shift()
    if (t && !t.cancelled) t.fn()
    await new Promise(setImmediate)
  }
  return { ...a, timers, tick, unmount: () => unmount.forEach((fn) => fn()) }
}

test('24 unique doors; daily preview follows the Danish December date', () => {
  const a = calendar()
  assert.deepEqual(
    Array.from(a.days).sort((a, b) => a - b),
    Array.from({ length: 24 }, (_, i) => i + 1),
  )
  a.currentDate.value = new Date('2026-11-06T12:00:00Z')
  assert.equal(a.today.value, 1)
  a.currentDate.value = new Date('2026-12-06T23:30:00Z')
  assert.equal(a.today.value, 6)
  a.currentDate.value = new Date('2026-12-07T03:00:00Z')
  assert.equal(a.today.value, 7)
  a.currentDate.value = new Date('2026-12-31T12:00:00Z')
  assert.equal(a.today.value, 24)
})

test('single and double door cutouts keep the same image scale and crop as the full scene', () => {
  const a = calendar()
  a.backgroundImage.value = { naturalWidth: 900, naturalHeight: 1400 }
  a.scene.value = {
    clientWidth: 360,
    clientHeight: 560,
    querySelectorAll: () => [
      { dataset: { day: '24' }, offsetLeft: 80, offsetTop: 200, offsetWidth: 160 },
    ],
  }
  a.measureSurfaces()
  assert.equal(a.surfaceStyle(24, 'left').backgroundSize, '360px 560px')
  assert.equal(a.surfaceStyle(24, 'left').backgroundPosition, '-80px -200px')
  assert.equal(a.surfaceStyle(24, 'right').backgroundPosition, '-160px -200px')
  a.scene.value.clientWidth = 420
  a.measureSurfaces()
  assert.equal(a.artwork.value.width, 420)
  assert.ok(Math.abs(a.artwork.value.height - 653.3333333333) < 0.001)
  assert.ok(Math.abs(a.artwork.value.y + 46.6666666667) < 0.001)
})

test('door opens after camera zoom, and reset returns to the full calendar', async () => {
  const a = calendar(),
    pending = a.reveal(7)
  await new Promise(setImmediate)
  assert.equal(a.phase.value, 'zooming')
  assert.equal(a.opened.value.length, 0)
  assert.match(a.transform.value, /scale\(3\.3\)/)
  await a.tick()
  assert.equal(a.phase.value, 'opening')
  assert.deepEqual(Array.from(a.opened.value), [7])
  await a.tick()
  assert.equal(await pending, true)
  assert.equal(a.phase.value, 'revealed')
  const reset = a.reset()
  await a.tick()
  await reset
  assert.equal(a.phase.value, 'overview')
  assert.equal(a.selected.value, null)
  assert.equal(a.opened.value.length, 0)
})

test('automatic preview opens all doors in date order, including reduced motion', async () => {
  for (const reduced of [false, true]) {
    const a = calendar(reduced),
      running = a.playAll()
    for (let i = 0; i < 150 && a.timers.length; i++) await a.tick()
    await running
    assert.deepEqual(
      Array.from(a.opened.value),
      Array.from({ length: 24 }, (_, i) => i + 1),
    )
    assert.equal(a.autoplay.value, false)
    assert.equal(a.phase.value, 'overview')
    assert.equal(a.selected.value, null)
    assert.equal(a.torn.value.length, 24)
  }
})

test('returning tears off both door types before zooming out and keeps removed leaves gone on revisit', async () => {
  for (const day of [7, 24]) {
    const a = calendar(),
      opening = a.reveal(day)
    await new Promise(setImmediate)
    await a.tick()
    await a.tick()
    await opening
    const returning = a.overview()
    assert.equal(a.phase.value, 'tearing')
    assert.equal(a.torn.value.length, 0)
    await a.tick()
    assert.equal(a.phase.value, 'returning')
    assert.deepEqual(Array.from(a.torn.value), [day])
    await a.tick()
    await returning
    assert.equal(a.phase.value, 'overview')
    assert.deepEqual(Array.from(a.opened.value), [day])
    const revisit = a.reveal(day)
    await new Promise(setImmediate)
    while (a.timers.length) await a.tick()
    await revisit
    const secondReturn = a.overview()
    assert.equal(a.phase.value, 'returning')
    await a.tick()
    await secondReturn
    assert.deepEqual(Array.from(a.torn.value), [day])
    const reset = a.reset()
    await a.tick()
    await reset
    assert.equal(a.torn.value.length, 0)
  }
})

test('stopping preview or leaving the page cancels pending openings', async () => {
  for (const leaving of [false, true]) {
    const a = calendar(),
      running = a.playAll()
    await a.tick()
    assert.equal(a.phase.value, 'zooming')
    if (leaving) a.unmount()
    else await a.playAll()
    await new Promise(setImmediate)
    while (a.timers.length) await a.tick()
    await running
    assert.equal(a.autoplay.value, false)
    assert.equal(a.opened.value.length, 0)
    if (!leaving) assert.equal(a.phase.value, 'overview')
  }
})

test('rapid taps cannot start overlapping zooms and reset cancels a pending camera measurement', async () => {
  const a = calendar()
  a.openDay(1)
  a.openDay(2)
  await new Promise(setImmediate)
  assert.equal(a.selected.value, 1)
  const reset = a.reset()
  while (a.timers.length) await a.tick()
  await reset
  assert.equal(a.selected.value, null)
  a.openDay(3)
  const immediateReset = a.reset()
  while (a.timers.length) await a.tick()
  await immediateReset
  assert.equal(a.phase.value, 'overview')
  assert.equal(a.selected.value, null)
  assert.equal(a.opened.value.length, 0)
})
