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
  const code = ts.transpileModule(source.replaceAll('import.meta.dev', 'true'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText
  const dayExports = {}
  vm.runInNewContext(
    ts.transpileModule(readFileSync('shared/utils/game-day.ts', 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText,
    { exports: dayExports },
  )
  const rewardExports = {}
  vm.runInNewContext(
    ts.transpileModule(readFileSync('shared/utils/advent-rewards.ts', 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText,
    { exports: rewardExports },
  )
  const context = vm.createContext({
    exports: {},
    require: (id) => (id.includes('advent-rewards') ? rewardExports : dayExports),
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
    definePageMeta() {},
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
      '\nglobalThis.api={celebration,days,opened,selected,phase,autoplay,today,currentDate,viewport,scene,transform,reveal,reset,playAll,openDay,backgroundImage,surfaces,artwork,measureSurfaces,surfaceStyle,overview,torn,pendingGifts,giftDay,giftOpening,givePreviewGift,calendar,testMode,restoreSaved};',
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

test('ungiven preview gifts remain available in the overview, independently of the selected door', () => {
  const a = calendar()
  a.opened.value = [8, 15]
  assert.equal(a.selected.value, null)
  assert.equal(a.pendingGifts.value.length, 2)
  a.giftDay.value = 8
  a.givePreviewGift('Nicole')
  assert.equal(a.giftOpening.value.gift.to, 'Nicole')
  assert.equal(a.pendingGifts.value.length, 1)
  assert.equal(a.pendingGifts.value[0].day, 15)
  a.giftDay.value = 15
  a.givePreviewGift('Mathias')
  assert.equal(a.pendingGifts.value.length, 0)
})

test('restored actual calendar exposes only opened, undelivered friend gifts', () => {
  const a = calendar()
  a.testMode.value = false
  const prize = { kind: 'friend-gift', amount: 100 }
  a.calendar.value = {
    doors: [
      { day: 1, opening: null },
      { day: 2, opening: { day: 2, prize } },
      { day: 3, opening: { day: 3, prize, gift: { to: 'Nicole' } } },
      { day: 4, opening: { day: 4, prize, gift: { to: 'Nicole', deliveredAt: '2026-12-04' } } },
    ],
  }
  a.restoreSaved()
  assert.deepEqual(
    Array.from(a.pendingGifts.value, (opening) => opening.day),
    [2, 3],
  )
  a.giftDay.value = 3
  assert.equal(a.giftOpening.value.gift.to, 'Nicole')
})

test('single and double door cutouts show the full image without cropping when resized', () => {
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
  assert.equal(a.artwork.value.width, 360)
  assert.equal(a.artwork.value.height, 560)
  assert.equal(a.artwork.value.x, 30)
  assert.equal(a.artwork.value.y, 0)
  assert.equal(a.surfaceStyle(24, 'left').backgroundPosition, '-50px -200px')
  a.scene.value.clientWidth = 270
  a.measureSurfaces()
  assert.equal(a.artwork.value.width, 270)
  assert.equal(a.artwork.value.height, 420)
  assert.equal(a.artwork.value.x, 0)
  assert.equal(a.artwork.value.y, 70)
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
  assert.equal(a.celebration.value, 7)
  const reset = a.reset()
  await a.tick()
  await reset
  assert.equal(a.phase.value, 'overview')
  assert.equal(a.selected.value, null)
  assert.equal(a.opened.value.length, 0)
  assert.equal(a.celebration.value, null)
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

test('tapping the revealed door returns to the calendar without reopening or claiming again', async () => {
  for (const preview of [true, false])
    for (const day of [7, 24]) {
      const a = calendar()
      if (!preview) {
        a.testMode.value = false
        a.calendar.value = {
          doors: [{ day, opening: { day, prize: { kind: 'bananas', amount: 25 } } }],
        }
      }
      const opening = a.reveal(day)
      await new Promise(setImmediate)
      while (a.timers.length) await a.tick()
      await opening
      const closing = a.openDay(day)
      assert.equal(a.phase.value, 'tearing')
      assert.equal(a.celebration.value, null)
      await a.openDay(day) // another tap during the return must not start anything
      while (a.timers.length) await a.tick()
      await closing
      assert.equal(a.phase.value, 'overview')
      assert.equal(a.selected.value, null)
      assert.equal(a.transform.value, 'none')
      assert.deepEqual(Array.from(a.opened.value), [day])
      assert.deepEqual(Array.from(a.torn.value), [day])
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
