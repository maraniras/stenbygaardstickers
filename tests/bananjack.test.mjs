import assert from 'node:assert/strict'
import test from 'node:test'
import { setup } from './helpers/economy-harness.mjs'
const harness = (remote) =>
  setup(remote, ['shared/utils/bananjack.ts', 'server/utils/bananjack.ts']).api
const deck = (...cards) => [...cards, ...Array(100).fill(9)]
const fresh = (a) => ({ ...a.freshEconomy(), balance: 250, peakBalance: 250 })

test('ace valuation, soft hands and a complete six-deck shuffle', () => {
  const a = harness(false)
  for (const [cards, total, soft] of [
    [[0, 0, 9], 12, false],
    [[0, 5], 17, true],
    [[0, 5, 9], 17, false],
    [[9, 12], 20, false],
  ]) {
    const s = a.jackScore(cards)
    assert.equal(s.total, total)
    assert.equal(s.soft, soft)
  }
  const d = a.jackDeck()
  assert.equal(d.length, 312)
  assert.equal(new Set(d).size, 312)
  assert.ok(d.every((c) => c >= 0 && c < 312))
})
test('natural pays 3:2 exactly, dealer blackjack loses and mutual blackjack pushes', () => {
  const a = harness(false)
  for (const [cards, expected, result] of [
    [deck(0, 8, 9, 7), 265, 'blackjack'],
    [deck(9, 0, 7, 9), 240, 'lose'],
    [deck(0, 0, 9, 9), 250, 'push'],
  ]) {
    const r = fresh(a)
    a.dealJack(r, 'round-a', null, 10, cards)
    assert.equal(r.balance, expected)
    assert.equal(r.bananjack.hands[0].result, result)
    assert.equal(r.bananjack.status, 'finished')
  }
})
test('dealer hole card and shoe are hidden; dealer stands on soft 17', () => {
  const a = harness(false),
    r = fresh(a)
  a.dealJack(r, 'round-a', null, 10, deck(9, 0, 7, 5, 2))
  const dto = a.jackPublic(r)
  assert.equal(dto.deck, undefined)
  assert.equal(dto.dealer[1], null)
  assert.equal(JSON.stringify(dto).includes('deck'), false)
  a.actJack(r, 'round-a', 0, 'stand')
  assert.equal(r.bananjack.dealer.length, 2)
  assert.equal(r.bananjack.hands[0].result, 'win')
  assert.equal(r.balance, 260)
})
test('bust skips dealer drawing; duplicate hit and settlement never repeat', () => {
  const a = harness(false),
    r = fresh(a)
  a.dealJack(r, 'round-a', null, 10, deck(9, 8, 6, 7, 9))
  a.actJack(r, 'round-a', 0, 'hit')
  const original = JSON.stringify(r)
  a.actJack(r, 'round-a', 0, 'hit')
  assert.equal(JSON.stringify(r), original)
  assert.equal(r.bananjack.dealer.length, 2)
  assert.equal(r.balance, 240)
})
test('double debits once, draws one card, settles and cannot exceed 50 per hand', () => {
  const a = harness(false),
    r = fresh(a)
  a.dealJack(r, 'round-a', null, 20, deck(4, 8, 5, 7, 9))
  a.actJack(r, 'round-a', 0, 'double')
  assert.equal(r.bananjack.hands[0].bet, 40)
  assert.equal(r.bananjack.hands[0].cards.length, 3)
  assert.equal(r.balance, 290)
  a.actJack(r, 'round-a', 0, 'double')
  assert.equal(r.balance, 290)
  const expensive = fresh(a)
  a.dealJack(expensive, 'round-b', null, 30, deck(4, 8, 5, 7))
  assert.ok(!a.jackActions(expensive.bananjack, expensive.balance).includes('double'))
  assert.throws(() => a.actJack(expensive, 'round-b', 0, 'double'))
})
test('split costs another bet; split aces each get one card and 21 pays only 1:1', () => {
  const a = harness(false),
    r = fresh(a)
  a.dealJack(r, 'round-a', null, 10, deck(0, 8, 0, 7, 9, 9))
  a.actJack(r, 'round-a', 0, 'split')
  assert.equal(r.bananjack.hands.length, 2)
  assert.equal(r.bananjack.status, 'finished')
  assert.equal(r.bananjack.staked, 20)
  assert.equal(r.balance, 270)
  for (const h of r.bananjack.hands) {
    assert.equal(h.cards.length, 2)
    assert.equal(h.result, 'win')
    assert.equal(h.payout, 20)
  }
})
test('splits advance through hands and cap at four', () => {
  const a = harness(false),
    r = fresh(a)
  a.dealJack(r, 'round-a', null, 10, deck(7, 9, 7, 6, 7, 7, 7, 7, 7, 7))
  for (let i = 0; i < 3; i++) a.actJack(r, 'round-a', i, 'split')
  assert.equal(r.bananjack.hands.length, 4)
  assert.ok(!a.jackActions(r.bananjack, r.balance).includes('split'))
  assert.throws(() => a.actJack(r, 'round-a', 3, 'split'))
  for (let i = 0; i < 4; i++) a.actJack(r, 'round-a', 3 + i, 'stand')
  assert.equal(r.bananjack.status, 'finished')
  assert.equal(r.bananjack.staked, 40)
})
test('invalid wagers, insufficient funds, stale round IDs and future revisions are rejected', () => {
  const a = harness(false),
    r = fresh(a)
  for (const bet of [-1, 0, 9, 11, 51, NaN, Infinity, '10'])
    assert.throws(() => a.dealJack(r, 'round-a', null, bet))
  r.balance = 9
  assert.throws(() => a.dealJack(r, 'round-a', null, 10))
  r.balance = 10
  a.dealJack(r, 'round-a', null, 10, deck(7, 9, 7, 6))
  assert.ok(!a.jackActions(r.bananjack, 0).includes('split'))
  assert.throws(() => a.dealJack(r, 'round-b', 'round-a', 10))
  assert.throws(() => a.actJack(r, 'wrong', 0, 'stand'))
  assert.throws(() => a.actJack(r, 'round-a', 1, 'stand'))
})
test('normal pushes return stake, dealer bust pays and an active hand survives serialization', () => {
  const a = harness(false)
  for (const [cards, balance, result] of [
    [deck(9, 9, 6, 6), 250, 'push'],
    [deck(9, 9, 7, 5, 9), 260, 'win'],
  ]) {
    let r = fresh(a)
    a.dealJack(r, 'round-a', null, 10, cards)
    r = JSON.parse(JSON.stringify(r))
    a.actJack(r, 'round-a', 0, 'stand')
    assert.equal(r.balance, balance)
    assert.equal(r.bananjack.hands[0].result, result)
  }
})
for (const remote of [false, true])
  test(`atomic rounds survive reload and simultaneous devices (${remote ? 'Redis CAS' : 'local'})`, async () => {
    const a = harness(remote)
    await a.mutateEconomy('Test', (r) => {
      r.balance = 250
      r.peakBalance = 250
    })
    await Promise.all(
      Array.from({ length: 8 }, () =>
        a.mutateEconomy('Test', (r) => a.dealJack(r, 'round-a', null, 10, deck(9, 8, 7, 7))),
      ),
    )
    let r = await a.readEconomy('Test')
    assert.equal(r.balance, 240)
    assert.equal(r.history.length, 1)
    assert.equal(a.jackPublic(r).dealer[1], null)
    await Promise.all(
      Array.from({ length: 8 }, () =>
        a.mutateEconomy('Test', (r) => a.actJack(r, 'round-a', 0, 'stand')),
      ),
    )
    r = await a.readEconomy('Test')
    assert.equal(r.balance, 260)
    assert.equal(r.history.length, 2)
    await a.mutateEconomy('Test', (r) => a.dealJack(r, 'round-b', 'round-a', 10, deck(9, 8, 7, 7)))
    await assert.rejects(
      a.mutateEconomy('Test', (r) => a.dealJack(r, 'round-a', null, 10, deck(0, 9, 9, 8))),
    )
    r = await a.readEconomy('Test')
    assert.equal(r.bananjack.id, 'round-b')
    assert.equal(r.balance, 250)
  })
