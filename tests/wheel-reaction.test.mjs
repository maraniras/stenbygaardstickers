import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import test from 'node:test'
import ts from 'typescript'
import { computed, ref, watch, effectScope } from 'vue'

const source = readFileSync('app/pages/spil/hjulet.vue', 'utf8').match(
  /<script setup lang="ts">([\s\S]*?)<\/script>/,
)[1]
const code = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText
function setup(prize, jackpot = false, reduced = false) {
  const state = ref({ day: '2026-10-30', wheel: null, wheelJackpot: jackpot ? prize : 500 }),
    shots = [],
    timers = []
  const scope = effectScope()
  const context = vm.createContext({
    exports: {},
    require: () => ({}),
    computed,
    ref,
    watch,
    useHead: () => {},
    useUser: () => ({ name: ref('Test'), ready: ref(true) }),
    useState: () => ref(false),
    onBeforeUnmount: () => {},
    wheelTarget: () => 180,
    WHEEL_SPIN_MS: 6500,
    useEconomy: () => ({
      state,
      error: ref(''),
      reload: async () => {},
      spin: async () => {
        state.value = {
          ...state.value,
          wheel: { prize, jackpot, jackpotAmount: jackpot ? prize : 500 },
        }
        return state.value
      },
    }),
    window: { matchMedia: () => ({ matches: reduced }) },
    setTimeout: (fn, duration) => {
      timers.push({ fn, duration })
      return 1
    },
    clearTimeout: () => {},
    shootConfetti: async (size) => shots.push(size),
  })
  scope.run(() => vm.runInContext(code + '\nglobalThis.api={play,spinning,reacted};', context))
  return { ...context.api, shots, timers, stop: () => scope.stop() }
}
for (const [prize, jackpot, reduced] of [
  [0, false, false],
  [1, false, false],
  [25, false, true],
  [400, true, false],
  [1000, true, true],
]) {
  test(`reaction follows the animation once: ${prize} bananas${reduced ? ' with reduced motion' : ''}`, async () => {
    const a = setup(prize, jackpot, reduced)
    const finished = a.play()
    await new Promise(setImmediate)
    assert.equal(a.spinning.value, true)
    assert.equal(a.reacted.value, false)
    assert.equal(a.shots.length, 0)
    assert.equal(a.timers[0].duration, reduced ? 100 : 6500)
    a.timers[0].fn()
    await finished
    assert.equal(a.spinning.value, false)
    assert.equal(a.reacted.value, true)
    assert.deepEqual(a.shots, prize ? [jackpot ? 'normal' : 'small'] : [])
    await a.play()
    assert.equal(a.shots.length, prize ? 1 : 0)
    a.stop()
  })
}
