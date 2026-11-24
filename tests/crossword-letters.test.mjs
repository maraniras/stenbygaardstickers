import test from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { setup } from './helpers/economy-harness.mjs'

const now = new Date('2027-01-04T12:00:00Z')
function game(remote = false) {
  const h = setup(remote, ['server/utils/crossword.ts'])
  h.state = { ...h.api.freshCrossword('marvel'), opensAt: '2027-01-04T11:00:00Z' }
  h.cells = Object.keys(h.api.crosswordSolution('marvel'))
  return h
}
for (const remote of [false, true]) {
  test(`ten paid letters debit 50 through 500 once, persist and stay private (${remote})`, async () => {
    const { api: a, state, cells } = game(remote)
    await a.mutateEconomy('Anna', (w) => {
      w.balance = 5000
    })
    for (const [i, price] of [50, 100, 150, 200, 250, 300, 350, 400, 450, 500].entries()) {
      const results = await Promise.all(
        Array.from({ length: 8 }, () => a.buyCrosswordLetter(state, 'Anna', cells[i], price, now)),
      )
      for (const shop of results) {
        assert.equal(shop.bought, i + 1)
        assert.equal(shop.letters[cells[i]], a.crosswordSolution('marvel')[cells[i]])
      }
    }
    const wallet = await a.readEconomy('Anna')
    assert.equal(wallet.balance, 2250)
    assert.equal(wallet.history.length, 10)
    assert.deepEqual(
      Array.from(wallet.history, (entry) => entry.amount),
      [-500, -450, -400, -350, -300, -250, -200, -150, -100, -50],
    )
    const shop = a.crosswordLetterShop(wallet, 'marvel')
    assert.equal(shop.nextPrice, null)
    assert.equal(shop.limit, 10)
    assert.equal(Object.keys(shop.letters).length, 10)
    assert.match(wallet.history[0].label, /bogstav 10\/10$/)
    await assert.rejects(a.buyCrosswordLetter(state, 'Anna', cells[10], 550, now), {
      statusCode: 409,
    })
    assert.equal((await a.readEconomy('Anna')).balance, 2250)
    assert.equal('crosswordLetterPurchases' in a.publicEconomy(wallet), false)
    assert.equal(a.crosswordLetterShop(await a.readEconomy('Emil'), 'marvel').bought, 0)
  })
  test(`concurrent devices cannot exceed ten purchases or accept a higher unconfirmed price (${remote})`, async () => {
    const { api: a, state, cells } = game(remote)
    await a.mutateEconomy('Anna', (w) => {
      w.balance = 5000
    })
    let attempts = await Promise.allSettled(
      cells.slice(0, 10).map((cell) => a.buyCrosswordLetter(state, 'Anna', cell, 50, now)),
    )
    assert.equal(attempts.filter((r) => r.status === 'fulfilled').length, 1)
    const bought = (await a.readEconomy('Anna')).crosswordLetterPurchases.marvel
    const remaining = cells.filter((cell) => !bought.includes(cell))
    for (const [i, price] of [100, 150, 200, 250, 300, 350, 400, 450].entries())
      await a.buyCrosswordLetter(state, 'Anna', remaining[i], price, now)
    attempts = await Promise.allSettled(
      remaining.slice(8, 18).map((cell) => a.buyCrosswordLetter(state, 'Anna', cell, 500, now)),
    )
    assert.equal(attempts.filter((r) => r.status === 'fulfilled').length, 1)
    const wallet = await a.readEconomy('Anna')
    assert.equal(wallet.crosswordLetterPurchases.marvel.length, 10)
    assert.equal(wallet.balance, 2250)
  })
  test(`a different crossword starts at 50 with ten purchases available while badge progress carries over (${remote})`, async () => {
    const { api: a, state, cells } = game(remote)
    await a.mutateEconomy('Anna', (w) => {
      w.balance = 1000
      w.crosswordLetterPurchases = { 'previous-puzzle': cells.slice(0, 10) }
    })
    const before = a.crosswordLetterShop(await a.readEconomy('Anna'), 'marvel')
    assert.equal(before.bought, 0)
    assert.equal(before.limit, 10)
    assert.equal(before.nextPrice, 50)
    await a.buyCrosswordLetter(state, 'Anna', cells[0], 50, now)
    const wallet = await a.readEconomy('Anna')
    assert.equal(wallet.balance, 950)
    assert.equal(wallet.crosswordLetterPurchases['previous-puzzle'].length, 10)
    assert.equal(a.crosswordLetterShop(wallet, 'marvel').nextPrice, 100)
    assert.equal(a.publicEconomy(wallet).crosswordHelpPurchases, 11)
  })
}

test('locked games, legacy, invalid cells, no funds and completed games reveal nothing and spend nothing', async () => {
  const { api: a, state, cells } = game()
  await a.mutateEconomy('Anna', (w) => {
    w.balance = 49
  })
  for (const [board, cell, price, status] of [
    [{ ...state, opensAt: null }, cells[0], 50, 403],
    [{ ...state, id: undefined }, cells[0], 50, 403],
    [state, '__proto__', 50, 400],
    [state, '0:0', 50, 400],
    [state, cells[0], 1, 409],
    [state, cells[0], 50, 400],
    [
      { ...state, finished: { 'u:anna': { name: 'Anna', at: now.toISOString() } } },
      cells[0],
      50,
      409,
    ],
  ])
    await assert.rejects(a.buyCrosswordLetter(board, 'Anna', cell, price, now), {
      statusCode: status,
    })
  assert.equal((await a.readEconomy('Anna')).balance, 49)
  assert.equal((await a.readEconomy('Anna')).history.length, 0)
})

test('owner-only purchased view survives another device; preview, guests and legacy never expose it', async () => {
  const { api: a, state, cells } = game()
  // Open relative to the actual clock for the view helper.
  state.opensAt = '2026-01-01T00:00:00Z'
  await a.mutateEconomy('Anna', (w) => {
    w.balance = 100
  })
  await a.buyCrosswordLetter(state, 'Anna', cells[0], 50, now)
  assert.equal(
    Object.keys((await a.crosswordViewForUser(state, 'Anna')).letterShop.letters).length,
    1,
  )
  assert.equal(
    Object.keys((await a.crosswordViewForUser(state, 'Emil')).letterShop.letters).length,
    0,
  )
  for (const view of [
    await a.crosswordViewForUser(state),
    await a.crosswordViewForUser(state, 'Anna', true),
    await a.crosswordViewForUser({ ...state, id: undefined }, 'Anna'),
    await a.crosswordViewForUser({ ...state, opensAt: null }, 'Anna'),
  ])
    assert.equal(view.letterShop, undefined)
})

test('letter API authenticates users, rejects preview and ignores forged identities', async () => {
  const { api: a, state, cells } = game()
  state.opensAt = '2026-01-01T00:00:00Z'
  await a.mutateCrossword((s) => Object.assign(s, state), 'marvel')
  await a.mutateEconomy('Anna', (w) => {
    w.balance = 100
  })
  a.defineEventHandler = (f) => f
  a.syncBadgesLater = async () => {}
  a.setHeader = () => {}
  a.getQuery = (e) => e.query || {}
  a.readBody = async (e) => e.body
  a.economyUser = async (e) => {
    if (!e.name) throw Object.assign(new Error('Login'), { statusCode: 401 })
    return { user: { name: e.name } }
  }
  const exports = {}
  vm.runInContext(
    `(function(exports){${ts.transpileModule(readFileSync('server/api/games/crossword/letter.post.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText}\n})`,
    a,
  )(exports)
  const request = {
    name: 'Anna',
    query: { id: 'marvel' },
    body: { cell: cells[0], price: 50, name: 'Emil' },
  }
  await assert.rejects(exports.default({ ...request, name: null }), { statusCode: 401 })
  await assert.rejects(exports.default({ ...request, query: { id: 'marvel', preview: '1' } }), {
    statusCode: 403,
  })
  const shop = await exports.default(request)
  assert.equal(shop.bought, 1)
  assert.equal((await a.readEconomy('Anna')).balance, 50)
  assert.equal(await a.readEconomy('Emil'), undefined)
})
