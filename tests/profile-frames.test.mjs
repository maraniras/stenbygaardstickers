import assert from 'node:assert/strict'
import test from 'node:test'
import { existsSync, readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { setup } from './helpers/economy-harness.mjs'

const api = () =>
  setup(false, ['shared/utils/profile-frames.ts', 'server/utils/profile-frames.ts']).api

test('eight distinct shop frames have real assets, and prize frame is not sold', () => {
  const a = api()
  assert.equal(a.SHOP_PROFILE_FRAMES.length, 8)
  assert.equal(new Set(a.SHOP_PROFILE_FRAMES.map((f) => f.id)).size, 8)
  for (const f of a.SHOP_PROFILE_FRAMES) assert.ok(existsSync('public' + f.image))
  assert.ok(a.profileFrame('parcel-2026'))
  assert.equal(a.profileFrame('../../private'), undefined)
  assert.equal(
    a.SHOP_PROFILE_FRAMES.some((f) => f.id === 'parcel-2026'),
    false,
  )
})

test('legacy prize ownership survives unequipping, JSON reload and re-equipping', () => {
  const a = api()
  const user = { frame: 'parcel-2026' }
  assert.deepEqual([...a.frameInventory(user).owned], ['parcel-2026'])
  a.equipProfileFrame(user, null)
  const restored = JSON.parse(JSON.stringify(user))
  assert.equal(a.frameInventory(restored).equipped, null)
  assert.deepEqual([...a.frameInventory(restored).owned], ['parcel-2026'])
  a.equipProfileFrame(restored, 'parcel-2026')
  assert.equal(restored.frame, 'parcel-2026')
})

test('only owned catalog frames can be equipped; rejects forged ownership and bad input', () => {
  const a = api()
  const user = { ownedFrames: ['lava', 'lava', 'fake'], frame: 'lava' }
  for (const input of ['bananjack', 'fake', '', '/shop/frames/lava-v1.webp', undefined, {}, 5]) {
    assert.throws(() => a.equipProfileFrame(user, input), { statusCode: 403 })
    assert.equal(user.frame, 'lava')
  }
  a.equipProfileFrame(user, 'lava')
  assert.deepEqual([...user.ownedFrames], ['lava'])
})

function route(file, overrides = {}) {
  const a = api()
  const user = { name: 'Test', devices: { device: {} }, ownedFrames: ['lava'] }
  let writes = 0
  const ctx = {
    exports: {},
    defineEventHandler: (f) => f,
    setHeader: () => {},
    createError: (v) => Object.assign(new Error(v.statusMessage), v),
    readToken: () => 'token',
    userForToken: async () => ({ key: 'test', hash: 'device', user }),
    readBody: async () => ({ frame: 'lava' }),
    frameInventory: a.frameInventory,
    equipProfileFrame: a.equipProfileFrame,
    updateUser: async (_, change) => {
      writes++
      change(user)
      return user
    },
    ...overrides,
  }
  vm.runInNewContext(
    ts.transpileModule(readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText,
    ctx,
  )
  return { call: () => ctx.exports.default({}), user, writes: () => writes }
}

test('private inventory and equip routes require login, validate body and forbid unowned frames', async () => {
  for (const method of ['get', 'put']) {
    const r = route(`server/api/me/frames.${method}.ts`, { userForToken: async () => undefined })
    await assert.rejects(r.call, { statusCode: 401 })
    assert.equal(r.writes(), 0)
  }
  const invalid = route('server/api/me/frames.put.ts', { readBody: async () => ({}) })
  await assert.rejects(invalid.call, { statusCode: 400 })
  assert.equal(invalid.writes(), 0)
  const unowned = route('server/api/me/frames.put.ts', {
    readBody: async () => ({ frame: 'bananjack' }),
  })
  await assert.rejects(unowned.call, { statusCode: 403 })
  const ok = route('server/api/me/frames.put.ts')
  assert.equal((await ok.call()).equipped, 'lava')
  const revoked = route('server/api/me/frames.put.ts')
  revoked.user.devices = {}
  await assert.rejects(revoked.call, { statusCode: 401 })
})
