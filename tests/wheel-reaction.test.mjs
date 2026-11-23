import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import test from 'node:test'
import ts from 'typescript'
import { computed, ref, readonly, watch, effectScope } from 'vue'

const source = readFileSync('app/pages/spil/hjulet.vue', 'utf8').match(
  /<script setup lang="ts">([\s\S]*?)<\/script>/,
)[1]
const code = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText
function setup(prize, jackpot = false, reduced = false, interrupted = false) {
  const state = ref({
      day: '2026-10-30',
      wallet: { balance: 100 },
      wheel: null,
      wheelJackpot: jackpot ? prize : 500,
    }),
    shots = [],
    timers = []
  const name = ref('Test')
  let unmount
  const scope = effectScope()
  const context = vm.createContext({
    exports: {},
    require: () => ({}),
    computed,
    ref,
    readonly,
    watch,
    useHead: () => {},
    useUser: () => ({ name, ready: ref(true) }),
    useState: () => ref(false),
    onBeforeUnmount: (fn) => {
      unmount = fn
    },
    wheelTarget: () => 180,
    WHEEL_SPIN_MS: 6500,
    useEconomy: () => ({
      state,
      error: ref(''),
      reload: async () => {},
      spin: async () => {
        state.value = {
          ...state.value,
          wallet: { balance: 100 + prize },
          wheel: { prize, jackpot, jackpotAmount: jackpot ? prize : 500 },
        }
        if (interrupted) throw new Error('Response lost after the spin was saved')
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
  const balanceCode = ts.transpileModule(
    readFileSync('app/composables/usePresentedBalance.ts', 'utf8'),
    {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    },
  ).outputText
  vm.runInContext(balanceCode, context)
  scope.run(() =>
    vm.runInContext(code + '\nglobalThis.api={play,spinning,reacted,shownBalance};', context),
  )
  return {
    ...context.api,
    state,
    name,
    shots,
    timers,
    unmount: () => unmount(),
    stop: () => scope.stop(),
  }
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
    assert.equal(a.state.value.wallet.balance, 100 + prize)
    assert.equal(a.shownBalance.value, 100)
    // A foreground/background refresh must not expose the pending payout either.
    a.state.value = { ...a.state.value, wallet: { balance: 110 + prize } }
    assert.equal(a.shownBalance.value, 100)
    assert.equal(a.shots.length, 0)
    assert.equal(a.timers[0].duration, reduced ? 100 : 6500)
    a.timers[0].fn()
    await finished
    assert.equal(a.spinning.value, false)
    assert.equal(a.reacted.value, true)
    assert.equal(a.shownBalance.value, 110 + prize)
    assert.deepEqual(a.shots, prize ? [jackpot ? 'normal' : 'small'] : [])
    await a.play()
    assert.equal(a.shots.length, prize ? 1 : 0)
    a.stop()
  })
}

test('restored results show their balance immediately; a new account never inherits a frozen balance', async () => {
  const a = setup(25)
  a.state.value = { ...a.state.value, wallet: { balance: 150 } }
  assert.equal(a.shownBalance.value, 150)
  const finished = a.play()
  await new Promise(setImmediate)
  assert.equal(a.shownBalance.value, 150)
  a.name.value = 'Other'
  a.state.value = { day: '2026-10-31', wallet: { balance: 700 }, wheel: null }
  assert.equal(a.shownBalance.value, 700)
  a.timers[0].fn()
  await finished
  assert.equal(a.reacted.value, false)
  assert.equal(a.shownBalance.value, 700)
  a.stop()
})

test('leaving during a spin cancels its timer and never celebrates the hidden result', async () => {
  const a = setup(25)
  const finished = a.play()
  await new Promise(setImmediate)
  a.unmount()
  await finished
  assert.equal(a.reacted.value, false)
  assert.deepEqual(a.shots, [])
  a.stop()
})

test('an interrupted response reconciles the saved result and releases its balance without replay', async () => {
  const a = setup(25, false, false, true)
  await a.play()
  assert.equal(a.spinning.value, false)
  assert.equal(a.shownBalance.value, 125)
  assert.equal(a.timers.length, 0)
  assert.equal(a.reacted.value, false)
  await a.play()
  assert.equal(a.shownBalance.value, 125)
  assert.deepEqual(a.shots, [])
  a.stop()
})
