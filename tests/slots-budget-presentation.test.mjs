import assert from 'node:assert/strict'
import test from 'node:test'
import vm from 'node:vm'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { ref, computed } from 'vue'

function game() {
  const responses = [],
    pending = [],
    callbacks = []
  const result = ref(null),
    rolling = ref(false)
  const context = {
    exports: {},
    ref,
    computed,
    require: () => ({
      useSlotPresentation: () => ({
        result,
        rolling,
        reset() {
          result.value = null
          rolling.value = false
        },
        present(spin, animate) {
          if (!animate) {
            result.value = spin
            return Promise.resolve(true)
          }
          rolling.value = true
          return new Promise((resolve) =>
            pending.push({
              finish(shown = true) {
                if (shown) result.value = spin
                rolling.value = false
                resolve(shown)
              },
            }),
          )
        },
      }),
    }),
    watch: (_source, fn) => callbacks.push(fn),
    onMounted() {},
    onBeforeUnmount() {},
    setTimeout: () => 0,
    clearTimeout() {},
    queueMicrotask,
    crypto: { randomUUID: () => 'new-spin' },
    useState: () => ref(false),
    userToken: () => 'test-token',
    useUser: () => ({ name: ref('Test'), ready: ref(true), refreshMe: async () => {} }),
    useEconomy: () => ({ reload: async () => {} }),
    useSlotSound: () => ({ enabled: ref(false), toggle() {}, start() {}, play() {}, stop() {} }),
    shootConfetti: async () => {},
    $fetch: async () => responses.shift(),
  }
  const code = ts.transpileModule(readFileSync('app/composables/useBananditten.ts', 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText
  vm.runInNewContext(code, context)
  return { ...context.exports.useBananditten(), responses, pending, callbacks }
}
const response = (netLoss, sequence = 0) => ({
  balance: 500 - netLoss,
  dailyLimit: {
    amount: 300,
    netLoss,
    remaining: 300 - netLoss,
    reserved: 0,
    spent: Math.max(0, netLoss),
    nextResetAt: '2026-11-07T03:00:00.000Z',
  },
  spin: sequence
    ? {
        id: `spin-${sequence}`,
        sequence,
        bet: 5,
        payout: 215 - netLoss,
        multiplier: (215 - netLoss) / 5,
        reels: [],
      }
    : null,
})

for (const netLoss of [215, 190]) {
  test(`slot budget stays on the revealed result during a ${netLoss > 210 ? 'losing' : 'winning'} spin`, async () => {
    const a = game()
    a.responses.push(response(210))
    await a.refresh()
    a.responses.push(response(netLoss, 1))
    const running = a.spin()
    await new Promise(setImmediate)
    assert.equal(a.rolling.value, true)
    assert.equal(a.data.value.dailyLimit.netLoss, netLoss)
    assert.equal(a.dailyLimit.value.netLoss, 210)
    assert.equal(a.dailyLimit.value.remaining, 90)
    a.pending[0].finish()
    await running
    assert.equal(a.dailyLimit.value.netLoss, netLoss)
    assert.equal(a.dailyLimit.value.remaining, 300 - netLoss)
    assert.equal(a.shownBalance.value, 500 - netLoss)
  })
}

test('cancelled slot presentation does not reveal its budget; a restored spin does', async () => {
  const a = game()
  a.responses.push(response(210))
  await a.refresh()
  a.responses.push(response(215, 1))
  const running = a.spin()
  await new Promise(setImmediate)
  a.pending[0].finish(false)
  await running
  assert.equal(a.dailyLimit.value.netLoss, 210)
  a.responses.push(response(215, 1))
  await a.refresh()
  assert.equal(a.dailyLimit.value.netLoss, 215)
})
