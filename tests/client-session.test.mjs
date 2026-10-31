import assert from 'node:assert/strict'
import test from 'node:test'
import vm from 'node:vm'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { ref } from 'vue'

const code = (path) =>
  ts.transpileModule(readFileSync(path, 'utf8').replaceAll('import.meta.client', 'false'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText
function deferred() {
  let resolve, reject
  const promise = new Promise((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
function setup(fetch, claim = async () => {}) {
  const states = new Map(),
    storage = new Map([
      ['stenbygaard-user-token', 'token-a'],
      ['stenbygaard-ratings-claimed', 'Nicole'],
    ])
  const requests = {}
  vm.runInNewContext(code('app/utils/requests.ts'), { exports: requests })
  const api = {}
  vm.runInNewContext(code('app/composables/useUser.ts'), {
    exports: api,
    require: () => requests,
    $fetch: fetch,
    useState: (key, initial) => {
      if (!states.has(key)) states.set(key, ref(initial()))
      return states.get(key)
    },
    localStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
      removeItem: (key) => storage.delete(key),
    },
    useUsers: () => ({ reload: async () => {} }),
    useRatings: () => ({ reload: async () => {}, claim }),
    pushSupported: () => false,
  })
  const user = api.useUser()
  user.name.value = 'Nicole'
  user.ready.value = true
  return { user, storage }
}
test('late identity and preference responses cannot restore a logged-out user', async () => {
  const identity = deferred(),
    preference = deferred()
  const { user } = setup((path, options) =>
    options?.method === 'DELETE'
      ? Promise.resolve({})
      : path.endsWith('notify')
        ? preference.promise
        : identity.promise,
  )
  const loading = user.refreshMe(),
    saving = user.setNotify('likes', false)
  await new Promise(setImmediate)
  await user.logout()
  identity.resolve({ name: 'Nicole', seen: ['old'], notify: { likes: false }, push: true })
  preference.resolve({ likes: false })
  await Promise.all([loading, saving])
  assert.equal(user.name.value, null)
  assert.equal(user.seen.value, null)
  assert.equal(user.badgePush.value, false)
  assert.equal(Object.keys(user.notify.value).length, 0)
})
test('a pairing response arriving after logout is ignored', async () => {
  const response = deferred(),
    { user, storage } = setup((_path, options) =>
      options?.method === 'DELETE' ? Promise.resolve({}) : response.promise,
    )
  const pairing = user.pair('123456')
  await user.logout()
  response.resolve({ name: 'Mathias', token: 'new-token' })
  await pairing
  assert.equal(user.name.value, null)
  assert.equal(storage.has('stenbygaard-user-token'), false)
})
test('failed rating migration is retried and marked complete only after success', async () => {
  let calls = 0
  const { user, storage } = setup(
    async () => ({ name: 'Nicole' }),
    async () => {
      if (++calls === 1) throw Error('Offline')
    },
  )
  storage.delete('stenbygaard-ratings-claimed')
  await user.refreshMe()
  assert.equal(storage.has('stenbygaard-ratings-claimed'), false)
  await user.refreshMe()
  assert.equal(storage.get('stenbygaard-ratings-claimed'), 'Nicole')
  assert.equal(calls, 2)
})
test('shared reads deduplicate concurrent work and retry after failure', async () => {
  const api = {}
  vm.runInNewContext(code('app/utils/requests.ts'), { exports: api })
  let calls = 0
  const pending = deferred()
  const run = () => {
    calls++
    return pending.promise
  }
  const first = api.singleFlight('a', run),
    second = api.singleFlight('a', run)
  await new Promise(setImmediate)
  assert.equal(calls, 1)
  pending.reject(Error('Offline'))
  await Promise.allSettled([first, second])
  assert.equal(await api.singleFlight('a', async () => 42), 42)
})
