import assert from 'node:assert/strict'
import test from 'node:test'
import vm from 'node:vm'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { ref } from 'vue'

const compile = (path) =>
  ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
function context() {
  const oscillators = []
  const param = () => ({
    value: 0,
    setValueAtTime() {},
    linearRampToValueAtTime() {},
    exponentialRampToValueAtTime() {},
  })
  return {
    currentTime: 10,
    destination: {},
    oscillators,
    createGain: () => ({ gain: param(), connect() {}, disconnect() {} }),
    createOscillator() {
      const oscillator = {
        frequency: param(),
        connect() {},
        disconnect() {},
        starts: [],
        stops: [],
        start(at) {
          this.starts.push(at)
        },
        stop(at) {
          this.stops.push(at)
        },
      }
      oscillators.push(oscillator)
      return oscillator
    },
    close: async () => {},
  }
}
function engine(ctx) {
  const exports = {}
  vm.runInNewContext(compile('app/utils/slotAudio.ts'), { exports })
  return exports.createSlotAudio(ctx)
}
test('slot audio schedules reel stops and reveals the result after the final stop', () => {
  const ctx = context(),
    audio = engine(ctx)
  audio.play(2, [2800, 3300, 3800], false)
  const times = ctx.oscillators.map((o) => o.starts[0] - 10.02)
  for (const stop of [2.8, 3.3, 3.8]) {
    assert.ok(times.some((t) => Math.abs(t - stop) < 0.00001))
  }
  assert.ok(Math.abs(times.at(-4) - 3.9) < 0.00001)
  audio.stop()
  assert.ok(ctx.oscillators.every((o) => o.stops.at(-1) === undefined))
})
test('reduced motion skips reel sounds and jackpot has a longer fanfare', () => {
  const normal = context(),
    jackpot = context()
  engine(normal).play(2, [2800, 3300, 3800], true)
  engine(jackpot).play(100, [2800, 3300, 3800], true)
  assert.equal(normal.oscillators.length, 4)
  assert.equal(jackpot.oscillators.length, 8)
  assert.equal(normal.oscillators[0].starts[0], 10.02)
  assert.ok(jackpot.oscillators.at(-1).starts[0] > normal.oscillators.at(-1).starts[0])
})
function sound(saved = 'on', supported = true) {
  const exports = {},
    storage = new Map([['stenbygaard-slot-sound', saved]]),
    hooks = []
  const calls = { created: 0, resumes: 0, plays: 0, stops: 0, disposed: 0 }
  class Context {
    state = 'running'
    constructor() {
      calls.created++
    }
    async resume() {
      calls.resumes++
    }
  }
  vm.runInNewContext(compile('app/composables/useSlotSound.ts'), {
    exports,
    ref,
    require: (path) =>
      path.includes('slotAudio')
        ? {
            createSlotAudio: () => ({
              pull() {},
              play() {
                calls.plays++
              },
              stop() {
                calls.stops++
              },
              dispose() {
                calls.disposed++
              },
            }),
          }
        : { SLOT_STOP_MS: [2800, 3300, 3800] },
    localStorage: {
      getItem: (key) => storage.get(key),
      setItem: (key, value) => storage.set(key, value),
    },
    onBeforeUnmount: (fn) => hooks.push(fn),
    window: {
      AudioContext: supported ? Context : undefined,
      matchMedia: () => ({ matches: false }),
    },
  })
  return { ...exports.useSlotSound(), calls, storage, unmount: () => hooks.forEach((fn) => fn()) }
}
test('sound is gesture-unlocked, mute is remembered, and leaving disposes audio', () => {
  const a = sound()
  a.play(100)
  assert.equal(a.calls.created, 0)
  assert.equal(a.calls.plays, 0)
  a.start()
  a.play(2)
  assert.equal(a.calls.resumes, 1)
  assert.equal(a.calls.plays, 1)
  a.toggle()
  assert.equal(a.storage.get('stenbygaard-slot-sound'), 'off')
  assert.equal(a.calls.stops, 1)
  a.play(100)
  assert.equal(a.calls.plays, 1)
  a.unmount()
  assert.equal(a.calls.disposed, 1)
  const muted = sound('off')
  muted.start()
  assert.equal(muted.calls.created, 0)
  const unavailable = sound('on', false)
  assert.doesNotThrow(() => {
    unavailable.start()
    unavailable.play(2)
    unavailable.stop()
    unavailable.unmount()
  })
})
