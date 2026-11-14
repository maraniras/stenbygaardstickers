import assert from 'node:assert/strict'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'
import { readFileSync } from 'node:fs'
import { ref, computed, reactive, watch, watchEffect, nextTick } from 'vue'

function showcase({
  states = new Map([['name-prompt', ref('done')]]),
  storage = new Map(),
  failStorage = false,
  props: input = {},
} = {}) {
  const props = reactive({ year: 2026, preview: false, disabled: false, ...input })
  const mounted = [],
    unmounted = [],
    stops = []
  const context = vm.createContext({
    exports: {},
    ref,
    computed,
    defineProps: () => props,
    useState: (key, init) => {
      if (!states.has(key)) states.set(key, ref(init()))
      return states.get(key)
    },
    useInstall: () => ({ open: ref(false) }),
    watch: (...args) => {
      const stop = watch(...args)
      stops.push(stop)
      return stop
    },
    watchEffect: (...args) => {
      const stop = watchEffect(...args)
      stops.push(stop)
      return stop
    },
    onMounted: (fn) => mounted.push(fn),
    onBeforeUnmount: (fn) => unmounted.push(fn),
    localStorage: {
      getItem: (key) => {
        if (failStorage) throw Error('blocked')
        return storage.get(key) || null
      },
      setItem: (key, value) => {
        if (failStorage) throw Error('blocked')
        storage.set(key, value)
      },
    },
  })
  const script = readFileSync('app/components/AdventPrizeShowcase.vue', 'utf8').match(
    /<script setup lang="ts">([\s\S]*?)<\/script>/,
  )[1]
  vm.runInContext(
    ts.transpileModule(script, {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    }).outputText + '\nglobalThis.api={open,show,close,storageKey};',
    context,
  )
  mounted.forEach((fn) => fn())
  return {
    ...context.api,
    props,
    states,
    storage,
    unmount: () => {
      stops.forEach((stop) => stop())
      unmounted.forEach((fn) => fn())
    },
  }
}

test('prize overview opens once per season/device and can always be reopened manually', async () => {
  const first = showcase()
  await nextTick()
  assert.equal(first.open.value, true)
  assert.equal(first.storage.get('stenbygaard-advent-prizes:2026'), '1')
  first.close()
  assert.equal(first.open.value, false)
  first.show()
  assert.equal(first.open.value, true)
  first.unmount()
  assert.equal(first.open.value, false)
  const again = showcase({ states: first.states, storage: first.storage })
  await nextTick()
  assert.equal(again.open.value, false)
  again.props.year = 2027
  await nextTick()
  assert.equal(again.open.value, true)
  assert.equal(again.storage.get('stenbygaard-advent-prizes:2027'), '1')
  again.unmount()
})

test('test overview does not consume the real calendar introduction; blocked storage has an in-session fallback', async () => {
  const preview = showcase({ props: { preview: true }, failStorage: true })
  await nextTick()
  assert.equal(preview.open.value, true)
  assert.equal(preview.storageKey.value, 'stenbygaard-advent-prizes:2026:preview')
  preview.unmount()
  const previewAgain = showcase({
    states: preview.states,
    failStorage: true,
    props: { preview: true },
  })
  await nextTick()
  assert.equal(previewAgain.open.value, false)
  previewAgain.props.preview = false
  await nextTick()
  assert.equal(previewAgain.open.value, true)
  previewAgain.unmount()
})

test('introduction waits for other popups and calendar animations, then releases its modal lock', async () => {
  const states = new Map([
    ['name-prompt', ref('done')],
    ['release-news-pending', ref(true)],
  ])
  const view = showcase({ states, props: { disabled: true } })
  await nextTick()
  assert.equal(view.open.value, false)
  assert.equal(view.storage.size, 0)
  view.props.disabled = false
  await nextTick()
  assert.equal(view.open.value, false)
  states.get('release-news-pending').value = false
  await nextTick()
  assert.equal(view.open.value, true)
  view.close()
  assert.equal(states.get('advent-prizes-open').value, false)
  view.props.disabled = true
  view.show()
  assert.equal(view.open.value, false)
  view.unmount()
})
