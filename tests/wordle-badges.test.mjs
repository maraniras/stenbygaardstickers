import assert from 'node:assert/strict'
import test from 'node:test'
import { setup } from './helpers/economy-harness.mjs'
const context = { stickers: [], ratings: {}, comments: {} }
const now = new Date('2026-11-18T12:00:00Z')
const day = '2026-11-18'
const harness = (remote = false) =>
  setup(remote, ['server/utils/wordle.ts', 'server/utils/wordle-stats.ts']).api
const badges = (a, r) =>
  a
    .badgesFor('Test', [], {}, { now, economy: { test: a.publicEconomy(r) } })
    .filter((b) => b.id.startsWith('wordle-'))
function seed(r, d, attempts, won = true) {
  r.days[d] = {
    wordle: {
      guesses: Array(attempts).fill('BANAN'),
      finished: true,
      won,
      reward: won ? [50, 40, 30, 20, 15, 10][attempts - 1] : 0,
    },
  }
}

test('all five badges visible while missing; first-try gives four points and one 50-banana badge reward', () => {
  const a = harness(),
    r = a.freshEconomy()
  assert.equal(badges(a, r).length, 5)
  assert.equal(badges(a, r).filter((b) => b.earned).length, 0)
  a.settleEconomy(r, 'Test', context, now)
  a.applyWordleGuess(r, day, 'BANAN', 0, 'BANAN', now)
  a.settleEconomy(r, 'Test', context, now)
  const first = badges(a, r).find((b) => b.id === 'wordle-first')
  assert.equal(first.points, 4)
  assert.equal(first.worth, 4)
  assert.equal(a.bananaRewardFor(first), 50)
  assert.equal(first.earnedAt, day)
  assert.equal(r.balance, 360)
  const snapshot = JSON.stringify(r)
  a.settleEconomy(r, 'Test', context, now)
  assert.equal(JSON.stringify(r), snapshot)
  assert.equal(r.wordleStats.played, 1)
  assert.equal(r.wordleStats.firstWins, 1)
})

test('sixth-try win and fast-solver badge count the right outcomes', () => {
  const a = harness(),
    r = a.freshEconomy()
  seed(r, day, 6)
  a.settleEconomy(r, 'Test', context, now)
  assert.equal(r.wordleStats.lastWins, 1)
  assert.equal(r.wordleStats.quickWins, 0)
  assert.equal(badges(a, r).find((b) => b.id === 'wordle-last').points, 1)
  const quick = a.freshEconomy()
  for (let i = 0; i < 10; i++)
    seed(
      quick,
      new Date(Date.parse('2026-11-01T12:00:00Z') + i * 86400000).toISOString().slice(0, 10),
      3,
    )
  a.settleEconomy(quick, 'Test', context, now)
  assert.equal(quick.wordleStats.quickWins, 10)
  assert.equal(quick.wordleStats.winningGuesses, 30)
  assert.equal(badges(a, quick).find((b) => b.id === 'wordle-efficient').points, 3)
  assert.equal(quick.claims['badge:wordle-efficient'], true)
  assert.equal(quick.history.find((t) => t.id === 'badge:wordle-efficient').amount, 75)
})

test('pending games, loss and skipped day obey the 04:00 streak boundary without losing the best', () => {
  const a = harness(),
    r = a.freshEconomy()
  for (const d of ['2026-11-14', '2026-11-15', '2026-11-16']) seed(r, d, 2)
  r.days['2026-11-17'] = { wordle: { guesses: ['BILER'], finished: false, won: false, reward: 0 } }
  a.syncWordleStats(r)
  assert.equal(r.wordleStats.played, 3)
  assert.equal(r.wordleStats.bestStreak, 3)
  assert.equal(a.publicWordleStats(r, new Date('2026-11-18T02:59:59Z')).streak, 3)
  assert.equal(a.publicWordleStats(r, new Date('2026-11-18T03:00:00Z')).streak, 0)
  seed(r, day, 1)
  a.syncWordleStats(r)
  assert.equal(r.wordleStats.streak, 1)
  assert.equal(r.wordleStats.bestStreak, 3)
  seed(r, '2026-11-19', 6, false)
  a.syncWordleStats(r)
  assert.equal(r.wordleStats.streak, 0)
  assert.equal(r.wordleStats.wins, 4)
  assert.equal(r.wordleStats.played, 5)
  assert.deepEqual([...r.wordleStats.distribution], [1, 3, 0, 0, 0, 0])
})

test('lifetime tiers survive pruning; private day outcomes and guesses are not public', () => {
  const a = harness(),
    r = a.freshEconomy()
  for (let i = 0; i < 100; i++)
    seed(
      r,
      new Date(Date.parse('2026-07-01T12:00:00Z') + i * 86400000).toISOString().slice(0, 10),
      2,
    )
  a.settleEconomy(r, 'Test', context, now)
  assert.equal(r.wordleStats.wins, 100)
  assert.equal(r.wordleStats.bestStreak, 100)
  for (const id of ['wordle-wins', 'wordle-streak']) {
    const b = badges(a, r).find((b) => b.id === id)
    assert.equal(b.level, 5)
    assert.equal(b.points, 15)
    for (let level = 1; level <= 5; level++) assert.equal(r.claims[`badge:${id}:${level}`], true)
  }
  const before = JSON.stringify(r.wordleStats)
  a.trimGameDays(r, day)
  assert.equal(Object.keys(r.days).length, 0)
  a.syncWordleStats(r)
  assert.equal(JSON.stringify(r.wordleStats), before)
  const dto = a.publicWordleStats(r, now)
  assert.equal(dto.counted, undefined)
  assert.equal(JSON.stringify(dto).includes('BANAN'), false)
  dto.distribution[0] = 999
  assert.equal(r.wordleStats.distribution[0], 0)
})

for (const remote of [false, true])
  test(`concurrent stats migration and badge payouts are once-only (${remote ? 'Redis CAS' : 'local'})`, async () => {
    const a = harness(remote)
    await a.mutateEconomy('Test', (r) => seed(r, day, 1))
    await Promise.all(
      Array.from({ length: 8 }, () =>
        a.mutateEconomy('Test', (r) => a.settleEconomy(r, 'Test', context, now)),
      ),
    )
    const r = await a.readEconomy('Test')
    assert.equal(r.wordleStats.played, 1)
    assert.equal(r.wordleStats.wins, 1)
    assert.equal(r.history.filter((t) => t.id === 'badge:wordle-first').length, 1)
    assert.equal(r.history.filter((t) => t.id === 'badge:wordle-wins:1').length, 1)
  })
