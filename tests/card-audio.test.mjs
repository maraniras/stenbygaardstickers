import assert from 'node:assert/strict'
import test from 'node:test'
import vm from 'node:vm'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { ref } from 'vue'
const code = (path) =>
  ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
test('card audio reuses a short paper buffer and stops active sources on exit', () => {
  const exports = {},
    sources = []
  let buffers = 0,
    closed = false
  const param = () => ({
    value: 0,
    setValueAtTime() {},
    linearRampToValueAtTime() {},
    exponentialRampToValueAtTime() {},
  })
  const ctx = {
    sampleRate: 48000,
    currentTime: 7,
    destination: {},
    createBuffer(_channels, length) {
      buffers++
      return { getChannelData: () => new Float32Array(length) }
    },
    createBufferSource() {
      const source = {
        connect() {},
        disconnect() {},
        start(at) {
          this.startAt = at
        },
        stop(at) {
          this.stopAt = at
        },
      }
      sources.push(source)
      return source
    },
    createBiquadFilter: () => ({ frequency: param(), Q: param(), connect() {}, disconnect() {} }),
    createGain: () => ({ gain: param(), connect() {}, disconnect() {} }),
    async close() {
      closed = true
    },
  }
  vm.runInNewContext(code('app/utils/cardAudio.ts'), { exports })
  const audio = exports.createCardAudio(ctx)
  audio.card()
  audio.card()
  assert.equal(buffers, 1)
  assert.equal(sources.length, 2)
  assert.equal(sources[0].startAt, 7)
  assert.equal(sources[0].stopAt, 7.12)
  audio.dispose()
  assert.ok(sources.every((source) => source.stopAt === undefined))
  assert.equal(closed, true)
})
test('Bananjack mute survives reload, never opens audio automatically and ignores unsupported browsers', () => {
  const storage = new Map(),
    hooks = [],
    calls = { made: 0, cards: 0, stops: 0 }
  const setup = (supported = true) => {
    const exports = {}
    class Context {
      state = 'running'
      async resume() {}
    }
    vm.runInNewContext(code('app/composables/useJackSound.ts'), {
      exports,
      ref,
      require: () => ({
        createCardAudio: () => {
          calls.made++
          return {
            card() {
              calls.cards++
            },
            stop() {
              calls.stops++
            },
            dispose() {},
          }
        },
      }),
      localStorage: {
        getItem: (key) => storage.get(key),
        setItem: (key, value) => storage.set(key, value),
      },
      onBeforeUnmount: (fn) => hooks.push(fn),
      window: { AudioContext: supported ? Context : undefined },
    })
    return exports.useJackSound()
  }
  const audio = setup()
  audio.card()
  assert.equal(calls.made, 0)
  audio.unlock()
  audio.card()
  assert.equal(calls.cards, 1)
  audio.toggle()
  audio.card()
  assert.equal(calls.cards, 1)
  assert.equal(calls.stops, 1)
  const reloaded = setup()
  assert.equal(reloaded.enabled.value, false)
  reloaded.unlock()
  assert.equal(calls.made, 1)
  storage.clear()
  const unsupported = setup(false)
  assert.doesNotThrow(() => {
    unsupported.unlock()
    unsupported.card()
  })
  hooks.forEach((fn) => fn())
})
