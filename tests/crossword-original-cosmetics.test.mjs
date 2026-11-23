import assert from 'node:assert/strict'
import test from 'node:test'
import sharp from 'sharp'
import { crosswordSetup } from './helpers/crossword-harness.mjs'

for (const remote of [false, true]) {
  for (const alreadyPaid of [false, true]) {
    test(`original winner receives exclusive cosmetics exactly once (${remote}, paid=${alreadyPaid})`, async () => {
      const { api: a, users } = crosswordSetup(remote)
      const state = a.freshCrossword()
      state.winner = { name: 'Anna', at: '2026-11-23T12:00:00Z' }
      users.set('anna', { name: 'Anna', devices: {}, frame: 'lava', banner: 'doomsday-winner' })
      if (alreadyPaid)
        await a.mutateEconomy('Anna', (wallet) => {
          a.creditBananas(wallet, 'crossword:1:winner', 1000, 'Original prize')
          ;(wallet.crosswordWins ??= {})['1'] = state.winner.at
        })
      await Promise.all(Array.from({ length: 5 }, () => a.settleCrosswordWinner(state)))
      assert.deepEqual(Array.from(users.get('anna').ownedFrames), ['lava', 'original-winner'])
      assert.deepEqual(Array.from(users.get('anna').ownedBanners), [
        'doomsday-winner',
        'original-winner',
      ])
      assert.equal(users.get('anna').frame, 'lava')
      assert.equal(users.get('anna').banner, 'doomsday-winner')
      const wallet = await a.readEconomy('Anna')
      assert.equal(wallet.balance, 1000)
      assert.equal(wallet.history.length, 1)
      assert.equal(wallet.claims['crossword:1:frame'], true)
      assert.equal(wallet.claims['crossword:1:banner'], true)
      assert.equal(await a.settleCrosswordWinner(state), false)
      assert.equal(users.size, 1)
    })
  }
}

test('original cosmetics are registered, selectable and use real project assets', async () => {
  const { api: a } = crosswordSetup()
  assert.equal(a.profileFrame('original-winner').name, 'På Tværs #1 · Vinder')
  assert.ok(!a.SHOP_PROFILE_FRAMES.some((frame) => frame.id === 'original-winner'))
  const banner = a.profileBanner('original-winner')
  assert.ok(banner)
  assert.deepEqual(Array.from(a.ownedProfileBanners({ ownedBanners: ['original-winner'] })), [
    'original-winner',
  ])
  assert.equal(a.profileBannerFor({ banner: 'original-winner' }), banner.image)
  const image = await sharp('public' + banner.image).metadata()
  assert.ok(Math.abs(image.width / image.height - 3) < 0.01)
})
