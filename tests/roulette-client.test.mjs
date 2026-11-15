import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import test from 'node:test'
import ts from 'typescript'
import { randomUUID } from 'node:crypto'
import { ref, shallowRef, computed, watch, watchEffect, nextTick } from 'vue'

const start = Date.parse('2026-11-20T12:00:00Z')
const round = start / 30000
const iso = (milliseconds) => new Date(milliseconds).toISOString()
const fixture = (id = round) => ({
  serverTime: iso(start),
  round: {
    id,
    startsAt: iso(id * 30000),
    locksAt: iso(id * 30000 + 20000),
    revealsAt: iso(id * 30000 + 26000),
    endsAt: iso((id + 1) * 30000),
    phase: 'betting',
  },
  recent: [{ round: id - 1, number: '12' }],
  players: [],
  me: {
    balance: 995,
    total: 5,
    revision: 1,
    bets: [{ spot: 'n:00', amount: 5 }],
    limit: {
      amount: 300,
      netLoss: 0,
      reserved: 5,
      remaining: 295,
      nextResetAt: iso(start + 86400000),
      spent: 0,
    },
    stats: {
      rounds: 0,
      wins: 0,
      straightWins: 0,
      totalStaked: 0,
      totalPaid: 0,
      biggestWin: 0,
      net: 0,
    },
  },
})
function setup() {
  let clock = start
  let data = fixture()
  let handler
  const name = ref('Fixture')
  const states = new Map(),
    timers = new Map(),
    listeners = new Map(),
    calls = []
  const mounted = [],
    unmounted = []
  let nextTimer = 0
  const context = {
    exports: {},
    ref,
    shallowRef,
    computed,
    watch,
    watchEffect,
    Date: class extends Date {
      constructor(...args) {
        super(...(args.length ? args : [clock]))
      }
      static now() {
        return clock
      }
    },
    useUser: () => ({ name }),
    userToken: () => (name.value ? 'fixture-token' : ''),
    useState: (key, init) => {
      if (!states.has(key)) states.set(key, ref(init()))
      return states.get(key)
    },
    useEconomy: () => ({ reload: async () => {}, reloadPeople: async () => {} }),
    onMounted: (fn) => mounted.push(fn),
    onBeforeUnmount: (fn) => unmounted.push(fn),
    AbortController,
    crypto: { randomUUID },
    setInterval: (fn, ms) => {
      const id = ++nextTimer
      timers.set(id, { fn, ms })
      return id
    },
    clearInterval: (id) => timers.delete(id),
    document: {
      hidden: false,
      addEventListener: (key, fn) => listeners.set(key, fn),
      removeEventListener: (key) => listeners.delete(key),
    },
    window: {
      addEventListener: (key, fn) => listeners.set(key, fn),
      removeEventListener: (key) => listeners.delete(key),
    },
    $fetch: async (_url, options = {}) => {
      calls.push(options)
      if (handler) return handler(options)
      const response = structuredClone(data)
      response.serverTime = iso(clock)
      return response
    },
  }
  function load(path) {
    const exports = {}
    vm.runInNewContext(
      ts.transpileModule(readFileSync(path, 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
      }).outputText,
      { ...context, exports, require: () => load('shared/utils/roulette.ts') },
    )
    return exports
  }
  const api = load('app/composables/useRoulette.ts').useRoulette()
  return {
    api,
    name,
    calls,
    timers,
    listeners,
    states,
    mount: () => mounted.forEach((fn) => fn()),
    close: () => unmounted.forEach((fn) => fn()),
    data: (next) => {
      data = next
    },
    handler: (fn) => {
      handler = fn
    },
    advance: (ms) => {
      clock += ms
      for (const timer of timers.values()) if (timer.ms === 200) timer.fn()
    },
    flush: async () => {
      await new Promise(setImmediate)
      await nextTick()
    },
  }
}

test('roulette financial outcome stays hidden until the matching wheel has landed', async () => {
  const h = setup()
  h.mount()
  await h.flush()
  assert.equal(h.api.view.value.me.balance, 995)
  const paid = fixture()
  paid.round.phase = 'result'
  paid.round.result = '00'
  paid.me.balance = 1175
  paid.me.last = {
    round,
    number: '00',
    stake: 5,
    payout: 180,
    net: 175,
    bets: paid.me.bets,
    at: iso(start + 26000),
  }
  paid.me.limit.netLoss = -175
  h.advance(26000)
  h.data(paid)
  await h.api.refresh()
  assert.equal(h.api.wheelResult.value, '00')
  assert.equal(h.api.landing.value, true)
  assert.equal(h.api.result.value, undefined)
  assert.equal(h.api.view.value.me.balance, 995)
  assert.equal(h.api.view.value.me.limit.netLoss, 0)
  h.api.settled(round + 1)
  assert.equal(h.api.view.value.me.balance, 995)
  h.api.settled(round)
  assert.equal(h.api.result.value, '00')
  assert.equal(h.api.view.value.me.balance, 1175)
  assert.equal(h.api.view.value.me.limit.netLoss, -175)
  h.close()
})

test('returning in a later round cancels an old landing without leaking new outcomes', async () => {
  const h = setup()
  h.mount()
  await h.flush()
  const paid = fixture()
  paid.round.phase = 'result'
  paid.round.result = '00'
  paid.me.balance = 1175
  h.advance(26000)
  h.data(paid)
  await h.api.refresh()
  assert.equal(h.api.landing.value, true)
  const next = fixture(round + 1)
  next.me.balance = 1175
  next.me.bets = []
  next.me.total = 0
  h.advance(6000)
  h.data(next)
  await h.api.refresh()
  assert.equal(h.api.landing.value, false)
  assert.equal(h.api.canEdit.value, true)
  assert.equal(h.api.view.value.me.balance, 1175)
  h.api.settled(round)
  assert.equal(h.api.result.value, undefined)
  h.close()
})

test('ambiguous transport failures keep the same request nonce for retry', async () => {
  const h = setup()
  h.mount()
  await h.flush()
  h.handler(async (options) => {
    if (options.method === 'POST') throw Error('transport timeout')
    return fixture()
  })
  h.api.add('red', 5)
  await h.flush()
  const uncertain = h.api.uncertain.value
  assert.ok(uncertain?.id)
  assert.equal(h.api.canEdit.value, false)
  h.handler(undefined)
  h.api.retry()
  await h.flush()
  const writes = h.calls.filter((call) => call.method === 'POST')
  assert.equal(writes.length, 2)
  assert.equal(writes[0].body.id, writes[1].body.id)
  assert.equal(h.api.uncertain.value, null)
  h.close()
})

test('spectators cannot bet; unmount cancels polling and releases the animation flag', async () => {
  const h = setup()
  h.name.value = null
  const guest = fixture()
  delete guest.me
  h.data(guest)
  h.mount()
  await h.flush()
  assert.equal(h.api.canEdit.value, false)
  h.api.add('red', 5)
  await h.flush()
  assert.equal(h.calls.filter((call) => call.method === 'POST').length, 0)
  assert.ok(h.timers.size > 0)
  h.close()
  assert.equal(h.timers.size, 0)
  assert.equal(h.listeners.size, 0)
  assert.equal(h.states.get('roulette-animation')?.value ?? false, false)
})
