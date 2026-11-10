import assert from 'node:assert/strict'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'
import { readFileSync } from 'node:fs'
import { ref, computed, watch, effectScope } from 'vue'

const flush = () => new Promise(setImmediate)
async function client() {
  let now = Date.parse('2026-12-01T12:00:00Z'),
    answer,
    tick
  const timers = [],
    name = ref('Nicole'),
    scope = effectScope(),
    exports = {}
  const initial = () => ({
    year: 2026,
    serverNow: new Date(now).toISOString(),
    phase: 'playing',
    joined: true,
    day: '2026-12-01',
    remaining: 2,
    players: ['Nicole'],
    parcels: [],
    events: [],
  })
  let saved = initial()
  vm.runInNewContext(
    ts.transpileModule(
      readFileSync('app/composables/useParcelGame.ts', 'utf8').replaceAll(
        'import.meta.dev',
        'false',
      ),
      { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
    ).outputText,
    {
      exports,
      require: () => ({ registerRefresh: () => () => {} }),
      ref,
      computed,
      watch,
      useUser: () => ({ name, ready: ref(true) }),
      useEconomy: () => ({ reload: async () => {} }),
      useUsers: () => ({ reload: async () => {} }),
      useRoute: () => ({ query: {} }),
      userToken: () => name.value,
      Date: class extends Date {
        static now() {
          return now
        }
      },
      crypto: { randomUUID: () => 'unique-roll-request' },
      window: { matchMedia: () => ({ matches: false }) },
      onMounted: (fn) => fn(),
      onBeforeUnmount() {},
      clearInterval() {},
      setInterval: (fn) => {
        tick = fn
        return 1
      },
      setTimeout: (fn, ms) => {
        timers.push({ fn, ms })
        return 1
      },
      $fetch: async (_path, options) => {
        if (!options.method) return { ...saved, serverNow: new Date(now).toISOString() }
        return new Promise((resolve) => {
          answer = () => {
            saved = {
              ...initial(),
              remaining: 1,
              turn: { id: 'unique-roll-request', die: 6, at: new Date(now).toISOString() },
              pending: { id: 'unique-roll-request', deadline: new Date(now + 60000).toISOString() },
            }
            resolve(saved)
          }
        })
      },
    },
  )
  const api = scope.run(() => exports.useParcelGame())
  await flush()
  return {
    ...api,
    name,
    timers,
    answer: () => answer(),
    async finish() {
      const timer = timers.shift()
      now += timer.ms
      tick()
      timer.fn()
      await flush()
    },
    stop: () => scope.stop(),
  }
}
test('large die rolls for 2.3 seconds, then reveals the result for two seconds without extending choice deadline', async () => {
  const c = await client()
  try {
    const action = c.act('roll')
    assert.equal(c.rollStage.value, 'rolling')
    c.answer()
    await flush()
    assert.equal(c.state.value.remaining, 2)
    assert.equal(c.timers[0].ms, 2300)
    await c.finish()
    assert.equal(c.rollStage.value, 'result')
    assert.equal(c.rollDie.value, 6)
    assert.equal(c.seconds.value, 58)
    assert.equal(c.busy.value, true)
    assert.equal(c.timers[0].ms, 2000)
    await c.finish()
    await action
    assert.equal(c.rollStage.value, null)
    assert.equal(c.seconds.value, 56)
    assert.equal(c.busy.value, false)
  } finally {
    c.stop()
  }
})
test('switching account during a roll hides the overlay and discards the previous users result', async () => {
  const c = await client()
  try {
    const action = c.act('roll')
    c.answer()
    await flush()
    c.name.value = 'Mathias'
    await flush()
    assert.equal(c.rollStage.value, null)
    await c.finish()
    await action
    assert.notEqual(c.rollStage.value, 'result')
  } finally {
    c.stop()
  }
})
