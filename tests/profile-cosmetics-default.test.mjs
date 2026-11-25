import test from 'node:test'
import assert from 'node:assert/strict'
import sharp from 'sharp'
import vm from 'node:vm'
import ts from 'typescript'
import { readFileSync } from 'node:fs'
import { setup } from './helpers/economy-harness.mjs'
import { crosswordSetup } from './helpers/crossword-harness.mjs'

test('public user profiles expose effective defaults without leaking cosmetic inventory or opt-out preferences', async () => {
  const { api: a } = setup(false, [
    'shared/utils/profile-frames.ts',
    'shared/utils/profile-banners.ts',
  ])
  const users = [
    { name: 'Anna', ownedFrames: ['lava'], ownedBanners: ['crossword-2-winner'] },
    {
      name: 'Emil',
      ownedFrames: ['lava'],
      ownedBanners: ['crossword-2-winner'],
      frameHidden: true,
      bannerHidden: true,
    },
    {
      name: 'Nicole',
      ownedFrames: ['lava', 'bananjack'],
      ownedBanners: ['original-winner', 'doomsday-winner'],
    },
  ]
  const exports = {}
  vm.runInNewContext(
    ts.transpileModule(readFileSync('server/api/users.get.ts', 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText,
    {
      exports,
      require: () => a,
      defineEventHandler: (f) => f,
      setHeader: () => {},
      listUsers: async () => users,
    },
  )
  const result = await exports.default({})
  assert.equal(result[0].frame, 'lava')
  assert.equal(result[0].banner, 'crossword-2-winner')
  assert.equal(result[1].frame, undefined)
  assert.equal(result[1].banner, undefined)
  assert.equal(result[2].frame, undefined)
  for (const user of result) {
    assert.equal(user.ownedFrames, undefined)
    assert.equal(user.bannerHidden, undefined)
  }
})

test('single cosmetics default across reloads; explicit none, multiple ownership and selected items stay independent', () => {
  const { api: a } = setup(false, [
    'server/utils/profile-frames.ts',
    'server/utils/profile-banners.ts',
  ])
  for (const [field, owned, hidden, item, other, inventory, equip] of [
    [
      'frame',
      'ownedFrames',
      'frameHidden',
      'lava',
      'bananjack',
      a.frameInventory,
      a.equipProfileFrame,
    ],
    [
      'banner',
      'ownedBanners',
      'bannerHidden',
      'original-winner',
      'doomsday-winner',
      a.bannerInventory,
      a.equipProfileBanner,
    ],
  ]) {
    const user = { [owned]: [item, item, 'not-real'] }
    assert.equal(inventory(user).equipped, item)
    assert.equal(inventory(JSON.parse(JSON.stringify(user))).equipped, item)
    equip(user, null)
    assert.equal(user[hidden], true)
    assert.equal(inventory(JSON.parse(JSON.stringify(user))).equipped, null)
    equip(user, item)
    assert.equal(inventory(user).equipped, item)
    user[owned].push(other)
    assert.equal(inventory(user).equipped, item)
    delete user[field]
    assert.equal(inventory(user).equipped, null)
    assert.equal(inventory({}).equipped, null)
  }
})

for (const remote of [false, true])
  test(`crossword two winner receives both cosmetics once, without overwriting other choices (${remote})`, async () => {
    const { api: a, users } = crosswordSetup(remote)
    const state = a.freshCrossword('2')
    state.winner = { name: 'Anna', at: '2027-01-04T12:00:00Z' }
    users.set('anna', { name: 'Anna', devices: {}, frame: 'lava', banner: 'original-winner' })
    await a.settleCrosswordWinner(state)
    await a.settleCrosswordWinner(state)
    const user = users.get('anna')
    assert.deepEqual(Array.from(user.ownedFrames), ['lava', 'crossword-2-winner'])
    assert.deepEqual(Array.from(user.ownedBanners), ['original-winner', 'crossword-2-winner'])
    assert.equal(user.frame, 'lava')
    assert.equal(user.banner, 'original-winner')
    assert.equal((await a.readEconomy('Anna')).balance, 1000)
    assert.equal(a.profileFrame('crossword-2-winner').name, 'På Tværs #2 · Vinder')
    assert.equal(a.profileBanner('crossword-2-winner').name, 'På Tværs #2 · Vinder')
    assert.equal(users.size, 1)
    const banner = await sharp('public' + a.profileBanner('crossword-2-winner').image).metadata()
    assert.equal(banner.width / banner.height, 3)
  })
