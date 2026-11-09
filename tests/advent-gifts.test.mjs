import assert from 'node:assert/strict'
import test from 'node:test'
import vm from 'node:vm'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { setup } from './helpers/economy-harness.mjs'

const context = { stickers: [], ratings: {}, comments: {} }
const now = new Date('2026-12-10T12:00:00Z')
function harness(redis = false) {
  const h = setup(redis, ['server/utils/advent.ts', 'server/utils/advent-gifts.ts'])
  h.api.process = { env: {} }
  h.api.structuredClone = structuredClone
  h.pushes = []
  h.api.notifyUser = async (...args) => h.pushes.push(args)
  return h
}
function giftWallet(a, amount = 100) {
  const wallet = a.freshEconomy()
  wallet.balance = 500
  wallet.advent = {
    2026: {
      5: {
        day: 5,
        openedAt: now.toISOString(),
        amount: 0,
        prize: {
          kind: 'friend-gift',
          amount,
          title: 'Gave til en ven',
          description: 'En julehilsen',
        },
      },
    },
  }
  return wallet
}
function route(path, globals) {
  const exports = {}
  vm.runInNewContext(
    ts.transpileModule(readFileSync(path, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    { exports, defineEventHandler: (fn) => fn, ...globals },
  )
  return exports.default
}

test('only an opened friend-gift can reserve a different recipient; source amount is immutable', () => {
  const { api: a } = harness(),
    wallet = giftWallet(a)
  for (const [year, day] of [
    [2026, 4],
    [2026, '5'],
    [2025, 5],
  ])
    assert.throws(() => a.reserveAdventGift(wallet, 'Giver', 'Ven', year, day))
  assert.throws(
    () => a.reserveAdventGift(wallet, 'Giver', 'giver', 2026, 5),
    (e) => e.statusCode === 400,
  )
  const delivery = a.reserveAdventGift(wallet, 'Giver', 'Ven', 2026, 5)
  assert.equal(delivery.amount, 100)
  assert.equal(wallet.balance, 500)
  assert.equal(a.reserveAdventGift(wallet, 'Giver', 'ven', 2026, 5).id, delivery.id)
  assert.throws(
    () => a.reserveAdventGift(wallet, 'Giver', 'En anden', 2026, 5),
    (e) => e.statusCode === 409,
  )
  assert.throws(() => a.reserveAdventGift(giftWallet(a, -1), 'Giver', 'Ven', 2026, 5))
})

for (const redis of [false, true])
  test(`concurrent deliveries credit and notify once (${redis ? 'Redis CAS' : 'local'})`, async () => {
    const { api: a, pushes } = harness(redis)
    const delivery = a.reserveAdventGift(giftWallet(a), 'Giver', 'Ven', 2026, 5)
    const before = await a.mutateEconomy('Ven', (w) => a.settleEconomy(w, 'Ven', context, now))
    await Promise.all(Array.from({ length: 10 }, () => a.deliverAdventGift(delivery, context, now)))
    const received = await a.readEconomy('Ven')
    assert.equal(received.balance, before.record.balance + 120) // gift + first receiver badge (1 XP / 20 bananas)
    assert.equal(Object.keys(received.adventGifts).length, 1)
    assert.equal(received.history.filter((t) => t.id === delivery.id).length, 1)
    assert.equal(pushes.length, 1)
    assert.equal(pushes[0][0], 'Ven')
    assert.equal(pushes[0][2], 'gifts')
    assert.match(pushes[0][1].url, /gift=/)
    assert.equal(a.unseenAdventGifts(received).length, 1)
    a.markAdventGiftsSeen(received, ['someone-elses-gift'], now)
    assert.equal(a.unseenAdventGifts(received).length, 1)
    a.markAdventGiftsSeen(received, [delivery.id], now)
    assert.equal(a.unseenAdventGifts(received).length, 0)
    assert.equal(a.publicEconomy(received).adventGifts, undefined)
  })

test('failed recipient delivery can be retried without changing the reserved recipient', async () => {
  const { api: a } = harness(),
    sender = giftWallet(a)
  const first = a.reserveAdventGift(sender, 'Giver', 'Ven', 2026, 5)
  const mutate = a.mutateEconomy
  a.mutateEconomy = async () => {
    throw Error('Storage unavailable')
  }
  await assert.rejects(() => a.deliverAdventGift(first, context, now))
  a.mutateEconomy = mutate
  const retry = a.reserveAdventGift(sender, 'Giver', 'Ven', 2026, 5)
  await a.deliverAdventGift(retry, context, now)
  assert.equal(a.unseenAdventGifts(await a.readEconomy('Ven')).length, 1)
  assert.equal(sender.balance, 500)
})

test('gift APIs authenticate before reading private data or request bodies', async () => {
  for (const path of [
    'server/api/games/advent/gift.post.ts',
    'server/api/me/gifts.get.ts',
    'server/api/me/gifts/seen.post.ts',
  ]) {
    let touched = false
    const handle = route(path, {
      economyUser: async () => {
        throw Object.assign(Error('Login'), { statusCode: 401 })
      },
      readBody: () => {
        touched = true
      },
      readEconomy: () => {
        touched = true
      },
    })
    await assert.rejects(
      () => handle({}),
      (e) => e.statusCode === 401,
    )
    assert.equal(touched, false)
  }
})

test('inbox and seen endpoint use the authenticated owner, never a body-supplied user', async () => {
  const { api: a } = harness()
  const first = a.reserveAdventGift(giftWallet(a), 'Giver', 'Ven', 2026, 5)
  const other = a.reserveAdventGift(giftWallet(a), 'Anden giver', 'Anden ven', 2026, 5)
  await a.deliverAdventGift(first, context, now)
  await a.deliverAdventGift(other, context, now)
  let ids = [other.id]
  const globals = {
    ...a,
    economyUser: async () => ({ user: { name: 'Ven' } }),
    setHeader() {},
    readBody: async () => ({ ids, name: 'Anden ven' }),
  }
  const get = route('server/api/me/gifts.get.ts', globals)
  assert.equal((await get({}))[0].id, first.id)
  const seen = route('server/api/me/gifts/seen.post.ts', globals)
  assert.equal((await seen({})).length, 1)
  ids = [first.id]
  assert.equal((await seen({})).length, 0)
  assert.equal(a.unseenAdventGifts(await a.readEconomy('Anden ven')).length, 1)
})

test('send endpoint ignores forged amounts, sender and dates; updates only the proven opening', async () => {
  const { api: a } = harness()
  await a.mutateEconomy('Giver', (w) => {
    Object.assign(w, giftWallet(a))
    a.settleEconomy(w, 'Giver', context)
  })
  const before = (await a.readEconomy('Giver')).balance
  const handle = route('server/api/games/advent/gift.post.ts', {
    ...a,
    economyUser: async () => ({ user: { name: 'Giver' } }),
    setHeader() {},
    readBody: async () => ({
      year: 2026,
      day: 5,
      to: 'Ven',
      amount: 999999,
      from: 'Someone else',
      now: '2099-12-31',
    }),
    cleanName: (n) => n,
    findUser: async (n) => ({ user: { name: n } }),
    economyContext: async () => context,
    adventConfigsFor: async () => undefined,
    syncBadgesLater: async () => {},
  })
  await handle({})
  await handle({})
  const receipt = a.unseenAdventGifts(await a.readEconomy('Ven'))[0]
  assert.equal(receipt.amount, 100)
  assert.equal(receipt.from, 'Giver')
  const sender = await a.readEconomy('Giver')
  assert.equal(sender.advent[2026][5].gift.to, 'Ven')
  assert.ok(sender.advent[2026][5].gift.deliveredAt)
  assert.equal(sender.balance, before + 20) // only the one-time giver badge; no stake/debit
})
