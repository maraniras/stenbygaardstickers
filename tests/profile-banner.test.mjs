import test from 'node:test'
import assert from 'node:assert/strict'
import sharp from 'sharp'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { setup } from './helpers/economy-harness.mjs'

test('owned banners are selectable independently of frames and can be removed without losing ownership', async () => {
  const { api: a } = setup(false, [
    'shared/utils/profile-banners.ts',
    'server/utils/profile-banners.ts',
  ])
  const user = { name: 'Anna', devices: {}, ownedBanners: ['doomsday-winner'], frame: 'lava' }
  assert.equal(a.profileBannerFor(user), a.DOOMSDAY_PROFILE_BANNER)
  a.equipProfileBanner(user, 'doomsday-winner')
  assert.equal(a.profileBannerFor(user), a.DOOMSDAY_PROFILE_BANNER)
  assert.equal(user.frame, 'lava')
  a.equipProfileBanner(user, null)
  assert.equal(a.profileBannerFor(user), undefined)
  assert.deepEqual(Array.from(a.bannerInventory(user).owned), ['doomsday-winner'])
  assert.equal(a.bannerInventory(user).equipped, null)
  assert.throws(() => a.equipProfileBanner({ name: 'Other', devices: {} }, 'doomsday-winner'), {
    statusCode: 403,
  })
  assert.throws(() => a.equipProfileBanner(user, 'forged'), { statusCode: 403 })
  const image = await sharp('public' + a.DOOMSDAY_PROFILE_BANNER).metadata()
  assert.ok(Math.abs(image.width / image.height - 3) < 0.01)
})
function route(file, overrides = {}) {
  const a = setup(false, ['shared/utils/profile-banners.ts', 'server/utils/profile-banners.ts']).api
  const user = { name: 'Test', devices: { device: {} }, ownedBanners: ['doomsday-winner'] }
  let writes = 0
  const ctx = {
    exports: {},
    defineEventHandler: (f) => f,
    setHeader: () => {},
    createError: (v) => Object.assign(new Error(v.statusMessage), v),
    readToken: () => 'token',
    userForToken: async () => ({ key: 'test', hash: 'device', user }),
    readBody: async () => ({ banner: 'doomsday-winner' }),
    bannerInventory: a.bannerInventory,
    equipProfileBanner: a.equipProfileBanner,
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

test('private inventory and equip routes require login, validate body and forbid unowned banners', async () => {
  for (const method of ['get', 'put']) {
    const r = route(`server/api/me/banners.${method}.ts`, { userForToken: async () => undefined })
    await assert.rejects(r.call, { statusCode: 401 })
    assert.equal(r.writes(), 0)
  }
  const invalid = route('server/api/me/banners.put.ts', { readBody: async () => ({}) })
  await assert.rejects(invalid.call, { statusCode: 400 })
  assert.equal(invalid.writes(), 0)
  const unowned = route('server/api/me/banners.put.ts', {
    readBody: async () => ({ banner: 'bananjack' }),
  })
  await assert.rejects(unowned.call, { statusCode: 403 })
  const ok = route('server/api/me/banners.put.ts')
  assert.equal((await ok.call()).equipped, 'doomsday-winner')
  const revoked = route('server/api/me/banners.put.ts')
  revoked.user.devices = {}
  await assert.rejects(revoked.call, { statusCode: 401 })
})
