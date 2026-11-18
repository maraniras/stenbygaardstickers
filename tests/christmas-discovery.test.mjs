import assert from 'node:assert/strict'
import test from 'node:test'
import { setup } from './helpers/economy-harness.mjs'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { computed, ref, reactive, watch, nextTick, effectScope } from 'vue'

const { api } = setup(false, ['app/utils/christmasDiscovery.ts'])
const keys = (at) => Array.from(api.christmasDiscoveries(new Date(at)), (item) => item.key)
test('Christmas discovery follows actual 04:00 availability rather than locked preview cards', () => {
  assert.deepEqual(keys('2026-11-19T12:00:00Z'), [])
  assert.deepEqual(keys('2026-11-20T02:59:59Z'), [])
  assert.deepEqual(keys('2026-11-20T03:00:00Z'), ['2026:boxes', '2026:parcel-registration'])
  assert.deepEqual(keys('2026-11-24T12:00:00Z'), ['2026:boxes', '2026:parcel-registration'])
  assert.deepEqual(keys('2026-11-27T02:59:59Z'), ['2026:boxes'])
  assert.deepEqual(keys('2026-11-27T03:00:00Z'), ['2026:boxes', '2026:parcel-playing'])
  assert.deepEqual(keys('2026-12-01T03:00:00Z'), [
    '2026:boxes',
    '2026:parcel-playing',
    '2026:calendar',
  ])
  assert.deepEqual(keys('2027-01-02T12:00:00Z'), [])
})

test('discovery survives reloads, stays per account and only clears when entering the actual game', async () => {
  const memory = new Map(),
    states = new Map()
  const name = ref('Nicole'),
    ready = ref(true)
  const route = reactive({ path: '/spil', fullPath: '/spil', query: {} })
  const scope = effectScope()
  const exports = {}
  class FixedDate extends Date {
    constructor(...args) {
      super(...(args.length ? args : ['2026-11-20T12:00:00Z']))
    }
  }
  vm.runInNewContext(
    ts.transpileModule(readFileSync('app/composables/useChristmasDiscovery.ts', 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    {
      exports,
      require: () => ({ christmasDiscoveries: api.christmasDiscoveries }),
      Date: FixedDate,
      computed,
      ref,
      watch,
      useUser: () => ({ name, ready }),
      useRoute: () => route,
      useState: (key, init) => {
        if (!states.has(key)) states.set(key, ref(init()))
        return states.get(key)
      },
      localStorage: {
        getItem: (key) => memory.get(key) ?? null,
        setItem: (key, value) => memory.set(key, value),
      },
      onMounted() {},
      onBeforeUnmount() {},
      clearInterval() {},
    },
  )
  const state = scope.run(() => exports.useChristmasDiscovery())
  assert.equal(state.hasNew.value, true)
  route.path = '/spil/jul'
  route.fullPath = route.path
  await nextTick()
  assert.equal(state.hasNew.value, true, 'menu alone is not trying a game')
  route.path = '/spil/pakkeleg'
  route.fullPath = route.path
  await nextTick()
  assert.equal(state.hasNew.value, true, 'boxes still unseen')
  route.query = { preview: '1' }
  route.path = '/spil/bokse'
  route.fullPath = '/spil/bokse?preview=1'
  await nextTick()
  assert.equal(state.hasNew.value, true, 'test previews do not consume discovery')
  route.query = {}
  route.fullPath = route.path
  await nextTick()
  assert.equal(state.hasNew.value, false)
  const reloaded = scope.run(() => exports.useChristmasDiscovery())
  assert.equal(reloaded.hasNew.value, false)
  route.path = '/spil'
  route.fullPath = route.path
  await nextTick()
  name.value = 'Norsk'
  await nextTick()
  assert.equal(state.hasNew.value, true, 'another account has independent discovery')
  name.value = 'Nicole'
  await nextTick()
  assert.equal(state.hasNew.value, false)
  scope.stop()
})
