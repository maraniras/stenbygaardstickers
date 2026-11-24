import assert from 'node:assert/strict'
import test from 'node:test'
import { setup } from './helpers/economy-harness.mjs'

const now = new Date('2026-11-24T12:00:00Z')
const context = { stickers: [], ratings: {}, comments: {} }
function priorPurchases(count) {
  const purchases = {}
  for (let i = 0; i < count; i++)
    (purchases['older-' + Math.floor(i / 5)] ??= []).push(`0:${i % 5}`)
  return purchases
}
const badge = (a, w) =>
  a
    .badgesFor('Anna', [], {}, { now, economy: { anna: a.publicEconomy(w) } })
    .find((b) => b.id === 'crossword-help')

test('HJÆÆÆÆLP has exactly five tiers and cumulative points for all thresholds', () => {
  const { api: a } = setup(false, ['server/utils/crossword.ts'])
  for (const [count, level, points, next] of [
    [0, 0, 0, 1],
    [1, 1, 1, 5],
    [4, 1, 1, 5],
    [5, 2, 3, 10],
    [9, 2, 3, 10],
    [10, 3, 6, 25],
    [20, 3, 6, 25],
    [24, 3, 6, 25],
    [25, 4, 10, 50],
    [30, 4, 10, 50],
    [49, 4, 10, 50],
    [50, 5, 15, undefined],
    [55, 5, 15, undefined],
  ]) {
    const wallet = a.freshEconomy()
    wallet.crosswordLetterPurchases = priorPurchases(count)
    const b = badge(a, wallet)
    assert.equal(b.name, 'HJÆÆÆÆLP')
    assert.equal(b.level, level)
    assert.equal(b.points, points)
    assert.equal(b.next, next)
    assert.equal(b.earned, count > 0)
    assert.equal(b.levels, 5)
    assert.deepEqual(
      Array.from(b.steps, (s) => s.at),
      [1, 5, 10, 25, 50],
    )
  }
})

for (const remote of [false, true])
  test(`only successful unique purchases count, persist milestone dates and notify the right owner (${remote})`, async () => {
    const { api: a } = setup(remote, ['server/utils/crossword.ts'])
    const state = { ...a.freshCrossword('marvel'), opensAt: '2026-11-24T00:00:00Z' }
    const cells = Object.keys(a.crosswordSolution('marvel'))
    for (const threshold of [1, 5, 10, 25, 50]) {
      const name = 'Anna ' + threshold
      await a.mutateEconomy(name, (w) => {
        w.balance = 5000
        w.crosswordLetterPurchases = priorPurchases(threshold - 1)
      })
      await assert.rejects(a.buyCrosswordLetter(state, name, 'invalid', 50, now), {
        statusCode: 400,
      })
      await Promise.all(
        Array.from({ length: 8 }, () => a.buyCrosswordLetter(state, name, cells[0], 50, now)),
      )
      const wallet = await a.readEconomy(name)
      assert.equal(wallet.balance, 4950)
      assert.equal(a.publicEconomy(wallet).crosswordHelpPurchases, threshold)
      assert.equal(
        wallet.milestones[`crossword-help:${[1, 5, 10, 25, 50].indexOf(threshold) + 1}`],
        now.toISOString(),
      )
      wallet.history = []
      assert.equal(
        a.publicEconomy(wallet).crosswordHelpPurchases,
        threshold,
        'trimming history cannot erase progress',
      )
      const publicWallet = a.publicEconomy(wallet)
      assert.equal('crosswordLetterPurchases' in publicWallet, false)
      assert.equal(
        JSON.stringify(publicWallet).includes(cells[0]),
        false,
        'no purchased coordinates in public stats',
      )
    }
    assert.equal(await a.readEconomy('Someone else'), undefined)
  })

test('existing purchases are counted and normal badge rewards settle only once per tier', () => {
  const { api: a } = setup(false, ['server/utils/crossword.ts'])
  const wallet = a.freshEconomy()
  wallet.crosswordLetterPurchases = priorPurchases(50)
  // Duplicate coordinates in one legacy receipt never inflate the count.
  wallet.crosswordLetterPurchases['older-0'].push('0:0')
  assert.equal(a.publicEconomy(wallet).crosswordHelpPurchases, 50)
  a.settleEconomy(wallet, 'Anna', context, now)
  for (let level = 1; level <= 5; level++) {
    assert.equal(wallet.claims[`badge:crossword-help:${level}`], true)
    assert.equal(
      wallet.history.find((t) => t.id === `badge:crossword-help:${level}`).amount,
      level * 20,
    )
  }
  const before = JSON.stringify(wallet)
  a.settleEconomy(wallet, 'Anna', context, now)
  assert.equal(JSON.stringify(wallet), before)
  assert.equal(badge(a, wallet).steps.at(-1).reachedAt, '2026-11-24')
})
