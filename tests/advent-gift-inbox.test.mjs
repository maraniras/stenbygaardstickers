import assert from 'node:assert/strict'
import test from 'node:test'
import vm from 'node:vm'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { ref, watch } from 'vue'

const gift = {
  id: 'advent-gift:2026:5:0123456789abcdef01234567',
  from: 'Giver',
  amount: 100,
  year: 2026,
  day: 5,
  receivedAt: '2026-12-10T12:00:00Z',
}
const flush = () => new Promise(setImmediate)
function client() {
  const user = { name: ref('Ven'), ready: ref(true) },
    states = new Map(),
    storage = new Map(),
    calls = [],
    queue = []
  let receipts = [gift],
    failAck = false,
    teardown
  const exports = {}
  vm.runInNewContext(
    ts.transpileModule(readFileSync('app/composables/useAdventGiftInbox.ts', 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    {
      exports,
      require: () => ({ registerRefresh: () => () => {} }),
      ref,
      watch,
      useUser: () => user,
      useState: (key, initial) => {
        if (!states.has(key)) states.set(key, ref(initial()))
        return states.get(key)
      },
      userToken: () => user.name.value,
      queueMicrotask,
      onMounted() {},
      onBeforeUnmount: (fn) => {
        teardown = fn
      },
      localStorage: {
        getItem: (k) => storage.get(k) ?? null,
        setItem: (k, v) => storage.set(k, v),
      },
      $fetch: async (path, options) => {
        calls.push({ path, options })
        if (options.method === 'POST') {
          if (failAck) throw Error('Offline')
          receipts = []
          return []
        }
        if (queue.length) return await queue.shift()
        return receipts
      },
    },
  )
  return {
    ...exports.useAdventGiftInbox(),
    user,
    states,
    storage,
    calls,
    queue,
    setReceipts: (value) => {
      receipts = value
    },
    failAck: () => {
      failAck = true
    },
    recover: () => {
      failAck = false
    },
    close: () => teardown(),
  }
}

test('received gifts load at app startup and acknowledgements remember the owner', async () => {
  const c = client()
  await flush()
  assert.equal(c.gifts.value.length, 1)
  assert.equal(c.states.get('advent-gift-pending').value, true)
  c.dismiss()
  await flush()
  assert.equal(c.gifts.value.length, 0)
  const post = c.calls.find((x) => x.options.method === 'POST')
  assert.equal(post.options.headers['x-user-token'], 'Ven')
  assert.equal(post.options.body.ids[0], gift.id)
  await c.refresh()
  assert.equal(c.gifts.value.length, 0)
  c.close()
})

test('closing while offline does not repeat the popup; seen acknowledgement retries on refresh', async () => {
  const c = client()
  await flush()
  c.failAck()
  c.dismiss()
  await flush()
  await c.refresh()
  assert.equal(c.gifts.value.length, 0)
  assert.equal(c.calls.filter((x) => x.options.method === 'POST').length, 2)
  c.recover()
  await c.refresh()
  assert.equal(c.gifts.value.length, 0)
  c.close()
})

test('stale responses after switching accounts cannot disclose the previous user’s gift', async () => {
  const c = client()
  await flush()
  let resolve
  c.queue.push(
    new Promise((done) => {
      resolve = done
    }),
  )
  const oldRequest = c.refresh()
  c.user.name.value = 'En anden'
  c.setReceipts([])
  await flush()
  resolve([gift])
  await oldRequest
  await flush()
  await flush()
  assert.equal(c.gifts.value.length, 0)
  c.close()
})
