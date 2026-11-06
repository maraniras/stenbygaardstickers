import assert from 'node:assert/strict'
import test from 'node:test'
import vm from 'node:vm'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { ref, computed } from 'vue'

function client(preview) {
  const calls = [],
    queued = [],
    watches = []
  const user = { name: ref('Test'), ready: ref(true), refreshMe: async () => {} }
  const response = {
    year: 2026,
    previewAllowed: preview,
    availableDay: 0,
    doors: [],
    nextRefreshAt: '2026-12-01T03:00:00Z',
  }
  const exports = {}
  vm.runInNewContext(
    ts.transpileModule(readFileSync('app/composables/useAdventRewards.ts', 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    {
      exports,
      require: () => ({ registerRefresh: () => () => {} }),
      ref,
      computed,
      watch: (_source, fn) => watches.push(fn),
      onMounted() {},
      onBeforeUnmount() {},
      useUser: () => user,
      useEconomy: () => ({ reload: async () => {} }),
      userToken: () => user.name.value,
      setTimeout: () => 0,
      clearTimeout() {},
      queueMicrotask,
      $fetch: async (path, options) => {
        calls.push({ path, options })
        return queued.length ? await queued.shift() : response
      },
    },
  )
  return { ...exports.useAdventRewards(), calls, queued, watches, user, response }
}

test('preview never posts a reward request; real mode sends only year and door', async () => {
  const a = client(true)
  await a.refresh()
  assert.equal(a.testMode.value, true)
  assert.equal(await a.claim(1), false)
  assert.equal(a.calls.length, 1)
  a.testMode.value = false
  await a.claim(1)
  assert.equal(a.calls[1].options.method, 'POST')
  assert.deepEqual(JSON.parse(JSON.stringify(a.calls[1].options.body)), { year: 2026, day: 1 })
  assert.equal(a.calls[1].options.retry, 0)
})

test('production response hides test mode and failed claims leave saved openings unchanged', async () => {
  const a = client(false)
  await a.refresh()
  assert.equal(a.previewAllowed.value, false)
  assert.equal(a.testMode.value, false)
  a.queued.push(Promise.reject({ data: { statusMessage: 'Præmien er ikke klar endnu.' } }))
  assert.equal(await a.claim(1), false)
  assert.equal(a.state.value.doors.length, 0)
  assert.match(a.error.value, /ikke klar/)
})

test('a late response cannot restore another account’s private calendar', async () => {
  const a = client(false)
  let finish
  a.queued.push(
    new Promise((resolve) => {
      finish = resolve
    }),
  )
  const loading = a.refresh()
  a.user.name.value = 'Other'
  a.watches[0]()
  finish({ ...a.response, doors: [{ day: 1, opening: { prize: { title: 'Private prize' } } }] })
  await loading
  await new Promise(setImmediate)
  assert.equal(a.state.value.doors.length, 0)
  assert.equal(a.calls.at(-1).options.headers['x-user-token'], 'Other')
})
