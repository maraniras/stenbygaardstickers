import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'
import { computed, effectScope, nextTick, reactive, ref, watch } from 'vue'

// Kør komponentens rigtige reaktive login-flow med en kontrolleret timer.
const source = readFileSync(new URL('../app/components/NamePrompt.vue', import.meta.url), 'utf8')
  .match(/<script setup lang="ts">([\s\S]*?)<\/script>/)[1]
const script = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText

function setup(path = '/', alreadyReady = false) {
  const name = ref(null)
  const ready = ref(alreadyReady)
  const route = reactive({ path })
  const state = ref('pending')
  const stored = new Map()
  const timers = new Map()
  let nextTimer = 0
  let claims = 0
  const scope = effectScope()
  const context = vm.createContext({
    ref, computed, watch,
    useState: () => state,
    useUser: () => ({ name, ready, claim: async (input) => { claims++; name.value = input }, setBadgePush: async () => {} }),
    useStickers: () => ({ people: ref([]) }),
    useUsers: () => ({ isTaken: () => false }),
    useInstall: () => ({ open: ref(false) }),
    usePush: () => ({ on: ref(false), refresh: async () => {}, enable: async () => {} }),
    useRoute: () => route,
    onBeforeUnmount: () => {},
    pushSupported: () => true,
    needsHomeScreen: () => false,
    Notification: { permission: 'default' },
    localStorage: { getItem: k => stored.get(k), setItem: (k, value) => stored.set(k, value) },
    setTimeout: (fn) => { const id = ++nextTimer; timers.set(id, fn); return id },
    clearTimeout: id => timers.delete(id),
  })
  scope.run(() => vm.runInContext(`${script}\nglobalThis.api = { step, input, submit };`, context))
  return {
    name, ready, route, state, stored, api: context.api,
    get claims() { return claims },
    async tick() {
      const batch = [...timers.entries()]
      for (const [id, fn] of batch) { if (timers.delete(id)) fn() }
      await nextTick()
    },
    close: () => scope.stop(),
  }
}

test('login på Mig annullerer den ventende popup, også efter navigation', async () => {
  const t = setup('/mig')
  try {
    t.ready.value = true
    await nextTick()
    await t.tick() // Popup afventer, mens man er på Mig.
    t.name.value = 'Mathias'
    await nextTick()
    t.route.path = '/person/Mathias'
    await t.tick()
    assert.equal(t.state.value, 'done')
    assert.ok(t.stored.has('stenbygaard-name-asked'))
    await t.api.submit() // En eventuel forsinket indsendelse må ikke oprette igen.
    assert.equal(t.claims, 0)
  }
  finally { t.close() }
})

test('en allerede åben popup lukkes ved login andetsteds', async () => {
  const t = setup('/', true)
  try {
    await t.tick()
    assert.equal(t.state.value, 'open')
    t.name.value = 'Nicole'
    await nextTick()
    assert.equal(t.state.value, 'done')
  }
  finally { t.close() }
})

test('login i selve popuppen fortsætter til notifikationsspørgsmålet', async () => {
  const t = setup('/', true)
  try {
    await t.tick()
    t.api.input.value = 'Norsk'
    await t.api.submit()
    await nextTick()
    assert.equal(t.claims, 1)
    assert.equal(t.name.value, 'Norsk')
    assert.equal(t.state.value, 'open')
    assert.equal(t.api.step.value, 'push')
  }
  finally { t.close() }
})
