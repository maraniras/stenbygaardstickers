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
function setup(fetch, claim = async () => {}, existingStorage) {
  const states = new Map(),
    storage =
      existingStorage ??
      new Map([
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

test('a stale identity response cannot resurrect dismissed badges', async () => {
  const identity = deferred()
  const { user } = setup((path, options) =>
    path.endsWith('/seen') ? Promise.resolve({ seen: options.body.keys }) : identity.promise,
  )
  const loading = user.refreshMe()
  await new Promise(setImmediate)
  await user.markSeen(['slot-spins:1', 'level:2'])
  identity.resolve({ name: 'Nicole', seen: [] })
  await loading
  assert.deepEqual([...user.seen.value].sort(), ['level:2', 'slot-spins:1'])
  assert.equal(user.seen.value.includes('slot-spins:2'), false)
})

test('offline dismissals survive reload and are retried without leaking to another account', async () => {
  const first = setup(async () => {
    throw Error('Offline')
  })
  await first.user.markSeen(['slot-wins:1'])
  const saved = []
  const reloaded = setup(
    async (path, options) => {
      if (path.endsWith('/seen')) {
        saved.push(...options.body.keys)
        return { seen: [...saved] }
      }
      return { name: 'Nicole', seen: [] }
    },
    undefined,
    first.storage,
  )
  await reloaded.user.refreshMe()
  await new Promise(setImmediate)
  assert.deepEqual([...reloaded.user.seen.value], ['slot-wins:1'])
  assert.deepEqual(saved, ['slot-wins:1'])
  await reloaded.user.logout()
  first.storage.set('stenbygaard-user-token', 'token-b')
  const other = setup(
    async () => ({ name: 'Mathias', seen: ['commenter'] }),
    undefined,
    first.storage,
  )
  await other.user.refreshMe()
  assert.deepEqual([...other.user.seen.value], ['commenter'])
})

test('seen badges are saved in batches within the server limit', async () => {
  const batches = [],
    saved = []
  const { user } = setup(async (_path, options) => {
    batches.push(options.body.keys.length)
    saved.push(...options.body.keys)
    return { seen: [...saved] }
  })
  const keys = Array.from({ length: 601 }, (_, i) => `badge-${i}`)
  await user.markSeen(keys)
  assert.deepEqual(batches, [300, 300, 1])
  assert.deepEqual([...user.seen.value], keys)
})
