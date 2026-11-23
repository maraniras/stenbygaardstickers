import assert from 'node:assert/strict'
import test from 'node:test'
import { existsSync } from 'node:fs'
import sharp from 'sharp'
import { setup } from './helpers/economy-harness.mjs'

const game = (remote = false) => {
  const h = setup(remote, [
    'server/data/crossword-marvel.ts',
    'server/utils/crossword.ts',
    'shared/utils/admin-navigation.ts',
    'shared/utils/profile-frames.ts',
    'server/utils/profile-frames.ts',
  ])
  h.users = new Map()
  h.api.updateUser = async (key, change) => {
    const user = h.users.get(key) || { name: key, devices: {} }
    change(user)
    h.users.set(key, user)
    return user
  }
  return h
}
const now = new Date('2027-01-04T12:00:00Z')

test('Marvel is independently locked, server-only and has the accepted 128-word layout', async () => {
  const { api: a } = game()
  const state = a.freshCrossword('marvel')
  assert.equal(a.crosswordView(state, undefined, false, now).puzzle, undefined)
  assert.throws(() => a.submitCrossword(state, 'Anna', a.crosswordSolution('marvel'), now), {
    statusCode: 403,
  })
  const preview = a.crosswordView(state, undefined, true, now)
  assert.equal(preview.title, 'På Tværs: Doomsday Special')
  assert.equal(preview.puzzle.entries.length, 128)
  assert.equal(preview.winnerPrize, 500)
  assert.equal(preview.completionPrize, 50)
  assert.ok(preview.puzzle.entries.every((entry) => !('answer' in entry)))
  const cells = new Map()
  for (const entry of a.MARVEL_ENTRIES)
    for (const [i, letter] of [...entry.answer].entries()) {
      const cell = `${entry.row + (entry.down ? i : 0)}:${entry.col + (entry.down ? 0 : i)}`
      if (cells.has(cell)) assert.equal(cells.get(cell).letter, letter)
      const previous = cells.get(cell)
      cells.set(cell, { letter, count: (previous?.count || 0) + 1 })
    }
  assert.equal([...cells.values()].filter((cell) => cell.count === 2).length, 171)
  const pictures = preview.puzzle.entries.filter((entry) => entry.image)
  assert.equal(pictures.length, 6)
  for (const entry of pictures) assert.ok(existsSync('public' + entry.image.src))
  const blind = a.MARVEL_ENTRIES.find((entry) => entry.answer === 'BLIND')
  assert.equal(blind.image.width, 4)
  assert.equal(blind.image.height, 4)
  assert.equal(blind.image.hideCaption, true)
  assert.ok(!blind.clue.includes('Daredevil'))
  assert.equal(a.crosswordView(a.freshCrossword(), undefined, true, now).puzzle.entries.length, 104)
})

for (const remote of [false, true])
  test(`Marvel race and retry: one 500 winner, other finishers 50, legacy unaffected (${remote ? 'Redis CAS' : 'local'})`, async () => {
    const { api: a } = game(remote)
    await a.mutateCrossword((state) => {
      state.opensAt = '2027-01-04T11:00:00Z'
    }, 'marvel')
    const answers = a.crosswordSolution('marvel')
    const names = ['Anna', 'Emil', 'Nicole', 'Norsk', 'Morten']
    await Promise.all(
      names.map((name) =>
        a.mutateCrossword((state) => a.submitCrossword(state, name, answers, now), 'marvel'),
      ),
    )
    const state = await a.readCrossword('marvel')
    assert.equal(state.id, 'marvel')
    assert.equal(Object.keys(state.finished).length, 5)
    assert.equal((await a.readCrossword()).winner, null)
    // Recover after committing a completion but before paying it; repeat every payout.
    await Promise.all(Array.from({ length: 5 }, () => a.settleCrosswordWinner(state)))
    await Promise.all(
      names.flatMap((name) =>
        Array.from({ length: 5 }, () => a.settleCrosswordCompletion(state, name)),
      ),
    )
    for (const name of names) {
      const wallet = await a.readEconomy(name)
      assert.equal(wallet.balance, name === state.winner.name ? 500 : 50)
      assert.equal(!!wallet.crosswordWins?.marvel, name === state.winner.name)
      assert.equal(
        a.crosswordBadges(wallet).find((badge) => badge.id === 'crossword-marvel-winner').earned,
        name === state.winner.name,
      )
      assert.equal(wallet.crosswordWins?.['1'], undefined)
    }
    assert.equal(await a.settleCrosswordCompletion(state, 'Ikke gennemført'), false)
    const legacy = a.freshCrossword()
    legacy.winner = { name: 'Anna', at: now.toISOString() }
    await a.settleCrosswordWinner(legacy)
    assert.equal(
      (await a.readEconomy('Anna')).balance,
      1000 + (state.winner.name === 'Anna' ? 500 : 50),
    )
  })

test('Marvel help, player progress and leaderboard use its own answer key', () => {
  const { api: a } = game()
  const state = { ...a.freshCrossword('marvel'), opensAt: '2027-01-04T11:00:00Z' }
  assert.equal(a.crosswordHelpAt(state), '2027-01-06T03:00:00.000Z')
  const answers = a.crosswordSolution('marvel')
  a.crosswordHelp(state, 'u:anna', answers, now)
  const progress = a.crosswordAdminProgress(state, [{ name: 'Anna' }])
  assert.equal(Object.keys(progress.players[0].correctLetters).length, Object.keys(answers).length)
  assert.equal(a.crosswordLeaderboard(state, [{ name: 'Anna' }], now).players[0].words, 128)
  assert.throws(() => a.validateCrosswordAnswers(a.crosswordSolution(), 'marvel'), {
    statusCode: 400,
  })
})

test('Christmas admin period uses Copenhagen time, including January delivery period', () => {
  const { api: a } = game()
  for (const [date, visible] of [
    ['2026-10-31T22:59:59Z', false],
    ['2026-10-31T23:00:00Z', true],
    ['2027-01-15T22:59:59Z', true],
    ['2027-01-15T23:00:00Z', false],
  ])
    assert.equal(a.adminChristmasVisible(new Date(date)), visible)
})

test('the approved custom badge exists with transparency', async () => {
  const metadata = await sharp('public/badges/custom/crossword-marvel-winner.webp').metadata()
  assert.equal(metadata.hasAlpha, true)
  assert.equal(metadata.width, 256)
})

test('winner gets the exclusive frame once, can equip it, and keeps an existing frame', async () => {
  const h = game(),
    a = h.api
  h.users.set('anna', { name: 'Anna', devices: {}, frame: 'lava', ownedFrames: ['lava'] })
  const state = a.freshCrossword('marvel')
  state.winner = { name: 'Anna', at: now.toISOString() }
  state.finished['u:anna'] = state.winner
  await a.settleCrosswordWinner(state)
  const user = h.users.get('anna')
  assert.equal(user.frame, 'lava')
  assert.equal(user.ownedFrames.filter((id) => id === 'doomsday-winner').length, 1)
  assert.equal(user.ownedBanners.filter((id) => id === 'doomsday-winner').length, 1)
  assert.equal(user.banner, undefined, 'banner is owned but waits for the user to equip it')
  assert.equal(a.SHOP_PROFILE_FRAMES.length, 8)
  a.equipProfileFrame(user, 'doomsday-winner')
  assert.equal(a.frameInventory(user).equipped, 'doomsday-winner')
  a.equipProfileFrame(user, null)
  assert.equal(await a.settleCrosswordWinner(state), false)
  assert.equal(user.frame, undefined, 'a later payout retry does not equip a removed frame')
  assert.equal((await a.readEconomy('Anna')).balance, 500)
  assert.throws(() => a.equipProfileFrame({ name: 'Other', devices: {} }, 'doomsday-winner'), {
    statusCode: 403,
  })
})

test('frame entitlement recovers after an interrupted user update, even if bananas were already paid', async () => {
  const h = game(),
    a = h.api,
    state = a.freshCrossword('marvel')
  state.winner = { name: 'Anna', at: now.toISOString() }
  await a.mutateEconomy('Anna', (wallet) => {
    a.creditBananas(wallet, 'crossword:marvel:winner', 500, 'Prize', now)
    wallet.crosswordWins = { marvel: now.toISOString() }
  })
  const update = a.updateUser
  a.updateUser = async () => {
    throw Error('temporary failure')
  }
  await assert.rejects(a.settleCrosswordWinner(state), /temporary failure/)
  assert.equal((await a.readEconomy('Anna')).claims['crossword:marvel:frame'], undefined)
  a.updateUser = update
  await Promise.all(Array.from({ length: 5 }, () => a.settleCrosswordWinner(state)))
  const wallet = await a.readEconomy('Anna')
  assert.equal(wallet.balance, 500)
  assert.equal(wallet.claims['crossword:marvel:frame'], true)
  assert.equal(h.users.get('anna').frame, 'doomsday-winner')
  assert.equal(h.users.get('anna').ownedFrames.length, 1)
})
