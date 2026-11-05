import assert from 'node:assert/strict'
import test from 'node:test'
import vm from 'node:vm'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { ref, computed, watch, watchEffect, reactive, effectScope, nextTick } from 'vue'
const compile = (source) =>
  ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
const releaseUtils = {}
vm.runInNewContext(compile(readFileSync('shared/utils/releases.ts', 'utf8')), {
  exports: releaseUtils,
})
const now = new Date('2026-11-05T12:00:00Z')
test('announcements choose only the newest published version in Danish time', () => {
  const releases = [
    { version: '2.4' },
    { version: '2.5', date: '2099-01-01' },
    { version: '2.3', date: '2026-10-31' },
    { version: '2.3.1', date: '2026-11-05' },
  ]
  assert.equal(releaseUtils.latestPublishedRelease(releases, now).version, '2.3.1')
  assert.equal(
    releaseUtils.latestPublishedRelease(
      [{ version: '2.4', date: '2026-11-06' }],
      new Date('2026-11-05T23:30:00Z'),
    ).version,
    '2.4',
  )
  assert.equal(releaseUtils.latestPublishedRelease([{ version: '2.4' }], now), undefined)
})
function notice(storage = new Map(), version = '2.3.1') {
  const states = new Map(),
    hooks = [],
    cleanup = [],
    events = new Map(),
    exports = {},
    scope = effectScope()
  const release = { version, date: '2026-01-01', notes: ['Kun denne versions nyheder'] }
  scope.run(() =>
    vm.runInNewContext(compile(readFileSync('app/composables/useReleaseNews.ts', 'utf8')), {
      exports,
      ref,
      computed,
      watch,
      require: (path) => (path.includes('changelog') ? { CHANGELOG: [release] } : releaseUtils),
      useState: (key, initial) => {
        if (!states.has(key)) states.set(key, ref(initial()))
        return states.get(key)
      },
      onMounted: (fn) => hooks.push(fn),
      onBeforeUnmount: (fn) => cleanup.push(fn),
      localStorage: {
        getItem: (key) => storage.get(key) ?? null,
        setItem: (key, value) => storage.set(key, value),
      },
      window: {
        addEventListener: (key, fn) => events.set(key, fn),
        removeEventListener: (key) => events.delete(key),
      },
    }),
  )
  let api
  scope.run(() => {
    api = exports.useReleaseNews()
  })
  hooks.forEach((fn) => fn())
  return {
    ...api,
    storage,
    events,
    stop() {
      cleanup.forEach((fn) => fn())
      scope.stop()
    },
  }
}
test('release modal appears once per version/device, survives reload and never repeats after rollback', async () => {
  const storage = new Map(),
    first = notice(storage)
  await nextTick()
  assert.equal(first.pending.value, true)
  assert.equal(first.release.value.notes.length, 1)
  first.dismiss()
  await nextTick()
  assert.equal(first.pending.value, false)
  first.stop()
  const again = notice(storage)
  await nextTick()
  assert.equal(again.pending.value, false)
  again.stop()
  const rollback = notice(storage, '2.3')
  await nextTick()
  assert.equal(rollback.pending.value, false)
  rollback.stop()
  const newer = notice(storage, '2.3.2')
  await nextTick()
  assert.equal(newer.pending.value, true)
  newer.stop()
  const otherDevice = notice(new Map())
  assert.equal(otherDevice.pending.value, true)
  otherDevice.stop()
})
test('reading an update on another tab closes its modal and releases notification blocking', async () => {
  const a = notice()
  await nextTick()
  a.open.value = true
  a.storage.set('stenbygaard-release-seen', '2.3.1')
  a.events.get('storage')({ key: 'stenbygaard-release-seen' })
  await nextTick()
  assert.equal(a.pending.value, false)
  assert.equal(a.open.value, false)
  a.stop()
})
test('release modal waits for onboarding and animations, also when opening the news page from push', async () => {
  const scope = effectScope(),
    states = new Map(),
    timers = [],
    mount = [],
    stop = [],
    route = reactive({ path: '/', query: {} })
  const open = ref(false),
    pending = ref(true),
    installOpen = ref(null)
  const source = readFileSync('app/components/ReleaseNews.vue', 'utf8').match(
    /<script setup lang="ts">([\s\S]*?)<\/script>/,
  )[1]
  const context = {
    exports: {},
    ref,
    watchEffect,
    useReleaseNews: () => ({
      release: ref({ version: '2.3.1', notes: [] }),
      pending,
      open,
      dismiss: () => {
        pending.value = false
        open.value = false
      },
    }),
    useRoute: () => route,
    useRouter: () => ({ push() {} }),
    useInstall: () => ({ open: installOpen }),
    useState: (key, initial) => {
      if (!states.has(key)) states.set(key, ref(initial()))
      return states.get(key)
    },
    onMounted: (fn) => mount.push(fn),
    onBeforeUnmount: (fn) => stop.push(fn),
    setTimeout: (fn) => {
      timers.push(fn)
      return 1
    },
    clearTimeout() {},
  }
  scope.run(() => vm.runInNewContext(compile(source), context))
  mount.forEach((fn) => fn())
  timers.forEach((fn) => fn())
  await nextTick()
  assert.equal(open.value, false)
  states.get('name-prompt').value = 'done'
  await nextTick()
  assert.equal(open.value, true)
  states.get('bananjack-animation').value = true
  await nextTick()
  assert.equal(open.value, false)
  states.get('bananjack-animation').value = false
  route.path = '/upload'
  await nextTick()
  assert.equal(open.value, false)
  route.path = '/nyheder'
  await nextTick()
  assert.equal(pending.value, true)
  assert.equal(open.value, true)
  stop.forEach((fn) => fn())
  scope.stop()
})
