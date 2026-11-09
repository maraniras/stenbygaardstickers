import assert from 'node:assert/strict'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'
import { readFileSync } from 'node:fs'
import { ref, computed, reactive } from 'vue'

function picker(preview) {
  const props = reactive({
    year: 2026,
    preview,
    opening: { day: 8, prize: { kind: 'friend-gift', amount: 100 } },
  })
  const calls = [],
    events = []
  const context = vm.createContext({
    exports: {},
    ref,
    computed,
    defineProps: () => props,
    defineEmits:
      () =>
      (...args) =>
        events.push(args),
    useUser: () => ({ name: ref('Mathias') }),
    useUsers: () => ({ users: ref([{ name: 'Mathias' }, { name: 'Nicole' }]) }),
    sameName: (a, b) => a.toLowerCase() === b.toLowerCase(),
    userToken: () => {
      if (preview) throw Error('Preview must not use a token')
      return 'test-token'
    },
    $fetch: async (...args) => {
      calls.push(args)
    },
  })
  const source = readFileSync('app/components/AdventGiftPicker.vue', 'utf8').match(
    /<script setup lang="ts">([\s\S]*?)<\/script>/,
  )[1]
  vm.runInContext(
    ts.transpileModule(source, {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    }).outputText + '\nglobalThis.api={to,send,recipients};',
    context,
  )
  return { ...context.api, props, calls, events }
}

test('preview gift selection simulates a recipient without a token, request, balance change or push', async () => {
  const p = picker(true)
  assert.equal(p.recipients.value.length, 1)
  p.to.value = 'Mathias'
  await p.send()
  assert.equal(p.events.length, 0)
  p.to.value = 'Nicole'
  await p.send()
  assert.deepEqual(p.events, [['previewSent', 'Nicole']])
  assert.equal(p.calls.length, 0)
  p.props.opening.gift = { to: 'Nicole', deliveredAt: 'test' }
  await p.send()
  assert.equal(p.events.length, 1)
})

test('actual gift mode still uses the authenticated server endpoint and emits sent only after delivery', async () => {
  const p = picker(false)
  p.to.value = 'Nicole'
  await p.send()
  assert.equal(p.calls.length, 1)
  assert.equal(p.calls[0][0], '/api/games/advent/gift')
  assert.equal(p.calls[0][1].headers['x-user-token'], 'test-token')
  assert.deepEqual(p.events, [['sent']])
})
