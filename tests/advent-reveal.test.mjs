import assert from 'node:assert/strict'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'
import { readFileSync } from 'node:fs'
import { ref, computed } from 'vue'

function reveal(prize, extras = []) {
  const animation = ref(false),
    mounted = [],
    unmount = [],
    events = [],
    timers = []
  let confetti = 0
  const context = vm.createContext({
    exports: {},
    require: () => ({}),
    ref,
    computed,
    defineProps: () => ({ opening: { day: 4, prize, extras, amount: prize.amount ?? 0 } }),
    defineEmits: () => (event) => events.push(event),
    useState: () => animation,
    onMounted: (fn) => mounted.push(fn),
    onBeforeUnmount: (fn) => unmount.push(fn),
    shootConfetti: async () => {
      confetti++
    },
    setTimeout(fn) {
      const timer = { fn, cancelled: false }
      timers.push(timer)
      return timer
    },
    clearTimeout(timer) {
      timer.cancelled = true
    },
  })
  const source = readFileSync('app/components/AdventRewardReveal.vue', 'utf8').match(
    /<script setup lang="ts">([\s\S]*?)<\/script>/,
  )[1]
  vm.runInContext(
    ts.transpileModule(source, {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    }).outputText + '\nglobalThis.api={title,motif,elf};',
    context,
  )
  mounted.forEach((fn) => fn())
  return {
    ...context.api,
    animation,
    events,
    get confetti() {
      return confetti
    },
    finish: () => timers.filter((timer) => !timer.cancelled).forEach((timer) => timer.fn()),
    unmount: () => unmount.forEach((fn) => fn()),
  }
}

test('elf reveal stays distinct from wins; rare prizes and bundled physical extras receive one celebration', () => {
  const elf = reveal({ reward: 'elf', kind: 'bananas', amount: -75 })
  assert.equal(elf.elf.value, true)
  assert.equal(elf.confetti, 0)
  assert.equal(elf.animation.value, true)
  elf.finish()
  assert.deepEqual(elf.events, ['finished'])
  elf.unmount()
  assert.equal(elf.animation.value, false)
  for (const [prize, extras] of [
    [{ reward: 'mix-max', kind: 'physical' }, []],
    [{ reward: 'santa', kind: 'bananas' }, []],
    [{ reward: 'elf', kind: 'bananas' }, [{ reward: 'red-wine', kind: 'physical' }]],
  ]) {
    const effect = reveal(prize, extras)
    assert.equal(effect.confetti, 1)
    assert.equal(effect.elf.value, false)
    effect.unmount()
  }
})

test('leaving or changing doors cancels reveal completion and releases the notification animation lock', () => {
  const effect = reveal({ reward: 'banana-single', kind: 'bananas', amount: 25 })
  assert.equal(effect.confetti, 0)
  effect.unmount()
  effect.finish()
  assert.equal(effect.events.length, 0)
  assert.equal(effect.animation.value, false)
})
