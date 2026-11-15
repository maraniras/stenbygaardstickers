import assert from 'node:assert/strict'
import test from 'node:test'
import vm from 'node:vm'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { ref, watch } from 'vue'

const compile = (path) =>
  ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
const engineCode = compile('app/utils/rouletteAudio.ts')
const soundCode = compile('app/composables/useRouletteSound.ts')

function context() {
  const nodes = [],
    sources = [],
    buffers = [],
    listeners = new Map()
  const param = () => ({
    value: 0,
    setValueAtTime() {},
    linearRampToValueAtTime() {},
    exponentialRampToValueAtTime() {},
    cancelScheduledValues() {},
  })
  const node = (extra = {}) => {
    const n = {
      connected: false,
      connect() {
        this.connected = true
      },
      disconnect() {
        this.connected = false
      },
      ...extra,
    }
    nodes.push(n)
    return n
  }
  const source = (extra = {}) => {
    const n = node({
      starts: [],
      stops: [],
      start(at) {
        this.starts.push(at)
      },
      stop(at) {
        this.stops.push(at)
      },
      end() {
        this.onended?.()
      },
      ...extra,
    })
    sources.push(n)
    return n
  }
  return {
    nodes,
    sources,
    buffers,
    listeners,
    currentTime: 10,
    sampleRate: 48000,
    state: 'running',
    destination: {},
    closed: 0,
    createGain: () => node({ gain: param() }),
    createBiquadFilter: () => node({ frequency: param(), Q: param() }),
    createOscillator: () => source({ frequency: param() }),
    createBufferSource: () => source(),
    createBuffer(_channels, length) {
      const samples = new Float32Array(length)
      buffers.push(samples)
      return { getChannelData: () => samples }
    },
    addEventListener: (key, fn) => listeners.set(key, fn),
    removeEventListener: (key) => listeners.delete(key),
    async resume() {
      this.state = 'running'
    },
    async close() {
      this.closed++
      this.state = 'closed'
    },
  }
}
function engine(ctx) {
  const exports = {}
  vm.runInNewContext(engineCode, { exports })
  return exports.createRouletteAudio(ctx)
}
function sound({ saved = 'on', supported = true, browser = true, resume, factory = engine } = {}) {
  const ctx = context(),
    active = ref(false),
    exports = {},
    hooks = [],
    listeners = new Map()
  const storage = new Map([['stenbygaard-roulette-sound', saved]])
  let created = 0
  ctx.state = 'suspended'
  if (resume) ctx.resume = resume.bind(ctx)
  class Context {
    constructor() {
      created++
      return ctx
    }
  }
  const document = {
    hidden: false,
    addEventListener: (key, fn) => listeners.set(key, fn),
    removeEventListener: (key) => listeners.delete(key),
  }
  vm.runInNewContext(soundCode, {
    exports,
    ref,
    watch,
    require: () => ({ createRouletteAudio: factory }),
    onBeforeUnmount: (fn) => hooks.push(fn),
    ...(browser
      ? {
          window: { AudioContext: supported ? Context : undefined },
          document,
          localStorage: {
            getItem: (key) => storage.get(key),
            setItem: (key, value) => storage.set(key, value),
          },
        }
      : {}),
  })
  return {
    api: exports.useRouletteSound(active),
    ctx,
    active,
    storage,
    listeners,
    created: () => created,
    visibility(hidden) {
      document.hidden = hidden
      listeners.get('visibilitychange')?.()
    },
    unmount: () => hooks.forEach((fn) => fn()),
  }
}
const flush = () => new Promise(setImmediate)
const live = (ctx) => ctx.sources.filter((s) => s.connected)

test('rolling reuses one deterministic buffer and one bed; ticks only follow explicit calls', () => {
  const ctx = context(),
    audio = engine(ctx)
  audio.startRolling()
  audio.startRolling()
  assert.equal(ctx.sources.length, 1)
  assert.equal(ctx.sources[0].loop, true)
  assert.equal(ctx.sources[0].starts[0], 10)
  audio.tick()
  assert.equal(ctx.sources.length, 2)
  assert.equal(ctx.sources[1].stops[0], 10.03)
  ctx.sources[1].end()
  assert.equal(live(ctx).length, 1)
  const second = context()
  engine(second)
  assert.deepEqual(ctx.buffers, second.buffers)
  audio.dispose()
})

test('landing stops the bed, survives stopRolling(false), and all graphs disconnect on disposal', () => {
  const ctx = context(),
    audio = engine(ctx)
  audio.startRolling()
  audio.tick()
  audio.land()
  const clunk = ctx.sources.at(-1)
  assert.equal(ctx.sources[0].connected, false)
  assert.equal(clunk.stops[0], 10.15)
  audio.stopRolling(false)
  assert.equal(clunk.connected, true)
  clunk.end()
  assert.equal(clunk.onended, null)
  audio.dispose()
  audio.dispose()
  assert.equal(ctx.closed, 1)
  assert.ok(ctx.nodes.every((n) => !n.connected))
  const count = ctx.sources.length
  audio.tick()
  audio.land()
  audio.startRolling()
  assert.equal(ctx.sources.length, count)
})

test('tick overlap is bounded; stop immediately cleans sources even without ended events', () => {
  const ctx = context(),
    audio = engine(ctx)
  for (let i = 0; i < 100; i++) audio.tick()
  assert.equal(live(ctx).length, 8)
  audio.stop()
  assert.equal(live(ctx).length, 0)
  assert.ok(ctx.nodes.slice(1).every((n) => !n.connected))
  ctx.state = 'suspended'
  audio.tick()
  audio.land()
  audio.startRolling()
  assert.equal(ctx.sources.length, 100)
  audio.dispose()
})

test('active audio waits for gesture and running context; landing tail survives inactive watch', async () => {
  const h = sound()
  h.active.value = true
  h.api.tick()
  h.api.land()
  assert.equal(h.created(), 0)
  h.active.value = false
  h.active.value = true
  h.api.unlock()
  assert.equal(h.ctx.sources.length, 0)
  await flush()
  assert.equal(live(h.ctx).length, 1)
  h.api.unlock()
  assert.equal(h.ctx.sources.length, 1)
  h.api.tick()
  h.api.land()
  h.active.value = false
  assert.equal(h.ctx.sources.at(-1).connected, true)
  h.unmount()
  assert.equal(h.ctx.closed, 1)
  assert.equal(h.listeners.size, 0)
  assert.equal(h.ctx.listeners.size, 0)
  assert.ok(h.ctx.nodes.every((n) => !n.connected))
})

test('muting and hiding stop everything; returning only resumes an active unsettled bed', async () => {
  const h = sound()
  h.active.value = true
  h.api.unlock()
  await flush()
  h.api.tick()
  h.api.toggle()
  assert.equal(h.storage.get('stenbygaard-roulette-sound'), 'off')
  assert.equal(live(h.ctx).length, 0)
  const count = h.ctx.sources.length
  h.api.tick()
  h.api.land()
  h.api.unlock()
  assert.equal(h.ctx.sources.length, count)
  h.active.value = false
  h.active.value = true
  h.api.toggle()
  assert.equal(h.storage.get('stenbygaard-roulette-sound'), 'on')
  assert.equal(live(h.ctx).length, 1)
  h.visibility(true)
  assert.equal(live(h.ctx).length, 0)
  const hiddenCount = h.ctx.sources.length
  h.api.tick()
  h.api.unlock()
  assert.equal(h.ctx.sources.length, hiddenCount)
  h.visibility(false)
  assert.equal(live(h.ctx).length, 1)
  h.api.land()
  h.visibility(true)
  h.visibility(false)
  assert.equal(live(h.ctx).length, 0)
  h.unmount()
})

test('saved mute, unsupported audio, SSR, and failed resume are harmless', async () => {
  for (const options of [{ saved: 'off' }, { supported: false }, { browser: false }]) {
    const h = sound(options)
    h.active.value = true
    h.api.unlock()
    h.api.tick()
    h.api.land()
    assert.equal(h.created(), 0)
    h.unmount()
  }
  const h = sound({
    resume: async () => {
      throw Error('blocked')
    },
  })
  h.active.value = true
  h.api.unlock()
  await flush()
  assert.equal(h.ctx.sources.length, 0)
  h.unmount()
  const failed = sound({
    factory: () => {
      throw Error('unsupported synthesis')
    },
  })
  failed.api.unlock()
  assert.equal(failed.ctx.closed, 1)
  failed.unmount()
})

test('a late resume cannot restart audio after hiding, muting or unmounting', async () => {
  for (const action of ['hide', 'mute', 'unmount']) {
    let finish
    const h = sound({
      resume() {
        return new Promise((resolve) => {
          finish = () => {
            this.state = 'running'
            resolve()
          }
        })
      },
    })
    h.active.value = true
    h.api.unlock()
    if (action === 'hide') h.visibility(true)
    else if (action === 'mute') h.api.toggle()
    else h.unmount()
    finish()
    await flush()
    assert.equal(h.ctx.sources.length, 0)
    if (action !== 'unmount') h.unmount()
  }
})
