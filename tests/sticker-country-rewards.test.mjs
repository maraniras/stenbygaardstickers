import assert from 'node:assert/strict'
import test from 'node:test'
import { setup } from './helpers/economy-harness.mjs'

const now = new Date('2026-11-18T12:00:00Z')
function sticker(id, km, countryCode = 'PH', placedBy = ['Mathias']) {
  return {
    id: String(id),
    title: `Sticker ${id}`,
    date: `2026-01-${String(Number(id) || 1).padStart(2, '0')}`,
    distanceKm: km,
    countryCode,
    placedBy,
    city: 'By',
    country: countryCode,
    lat: 0,
    lng: 0,
    media: [],
    description: '',
  }
}
function legacy(a, stickers, balance) {
  const r = a.freshEconomy()
  for (const s of stickers) {
    r.claims[`sticker:${s.id}`] = true
    const amount = a.stickerBananas(s.countryCode, s.distanceKm)
    r.history.push({
      id: `sticker:${s.id}`,
      amount,
      label: `Sticker · ${s.title}`,
      at: now.toISOString(),
    })
    r.balance += amount
  }
  r.peakBalance = r.balance
  if (balance !== undefined) r.balance = balance
  return r
}

test('the requested 1000/2000/1700 km example gives 750, 750, 250 for one person and country', () => {
  const { api: a } = setup(),
    r = a.freshEconomy()
  const all = [sticker(1, 1000), sticker(2, 2000), sticker(3, 1700)]
  a.settleStickerRewards(r, 'mAtHiAs', all, now)
  assert.deepEqual(
    all.map((s) => r.history.find((t) => t.id === `sticker:${s.id}`).amount),
    [750, 750, 250],
  )
  assert.equal(r.balance, 1750)
  const saved = JSON.stringify(r)
  a.settleStickerRewards(r, 'Mathias', [...all].reverse(), now)
  assert.equal(JSON.stringify(r), saved)
})

test('four long-distance stickers give 5750; each owner and country has its own record; DK is always 250', () => {
  const { api: a } = setup()
  const all = [1, 2, 3, 4].map((id) => sticker(id, 12000, 'PH', ['Mathias', 'Nicole']))
  for (const owner of ['Mathias', 'Nicole']) {
    const r = a.freshEconomy()
    a.settleStickerRewards(r, owner, all, now)
    assert.equal(r.balance, 5750)
    const extra = [
      ...all,
      sticker(5, 12000, 'AU', [owner]),
      sticker(6, 19000, 'dk', [owner]),
      sticker(7, 300, 'DK', [owner]),
    ]
    a.settleStickerRewards(r, owner, extra, now)
    assert.equal(r.balance, 11250)
    assert.equal(r.history.find((t) => t.id === 'sticker:5').amount, 5000)
    assert.equal(r.history.find((t) => t.id === 'sticker:6').amount, 250)
    assert.equal(r.history.find((t) => t.id === 'sticker:7').amount, 250)
  }
  const unrelated = a.freshEconomy()
  a.settleStickerRewards(unrelated, 'Norsk', all, now)
  assert.equal(unrelated.balance, 0)
})

test('total is independent of incremental order; backdated submissions do not repay an old country record', () => {
  const { api: a } = setup()
  const all = [sticker(1, 1000), sticker(2, 2000), sticker(3, 1700), sticker(4, 8000)]
  for (const order of [
    [0, 1, 2, 3],
    [3, 2, 1, 0],
    [1, 3, 0, 2],
  ]) {
    const r = a.freshEconomy(),
      approved = []
    for (const i of order) {
      approved.push(all[i])
      a.settleStickerRewards(r, 'Mathias', approved, now)
    }
    assert.equal(r.balance, 5750)
  }
})

test('migration debits the difference once, preserves original transactions, and does not change badge or game claims', () => {
  const { api: a } = setup(),
    all = [sticker(1, 1000), sticker(2, 2000), sticker(3, 1700)]
  const r = legacy(a, all)
  r.claims['badge:far'] = true
  r.claims['wheel:2026-11-18'] = true
  const oldBalance = r.balance,
    oldPeak = r.peakBalance
  a.settleStickerRewards(r, 'Mathias', all, now)
  assert.equal(r.balance, 1750)
  const change = r.history.find((t) => t.id === 'sticker-country:v2')
  assert.equal(change.amount, 1750 - oldBalance)
  assert.equal(r.history.filter((t) => t.id.startsWith('sticker:')).length, 3)
  assert.equal(r.peakBalance, oldPeak)
  assert.equal(r.claims['badge:far'], true)
  assert.equal(r.claims['wheel:2026-11-18'], true)
  const saved = JSON.stringify(r)
  a.settleStickerRewards(r, 'Mathias', all, new Date('2026-11-19'))
  assert.equal(JSON.stringify(r), saved)
})

test('insufficient balance stops at zero without debt or deductions from later rewards', () => {
  const { api: a } = setup(),
    all = [1, 2, 3, 4].map((id) => sticker(id, 12000))
  const r = legacy(a, all, 100)
  a.settleStickerRewards(r, 'Mathias', all, now)
  assert.equal(r.balance, 0)
  assert.equal(r.stickerRewards.migration.applied, -100)
  assert.equal(r.stickerRewards.migration.difference, -14250)
  assert.equal(r.stickerRewards.migration.forgiven, 14150)
  a.settleStickerRewards(r, 'Mathias', [...all, sticker(5, 12000)], now)
  assert.equal(r.balance, 250)
  assert.equal(r.history.filter((t) => t.id === 'sticker-country:v2').length, 1)
})

test('retained history is authoritative; trimmed old claims use the legacy curve; receipt snapshots survive deletion/edits', () => {
  const { api: a } = setup(),
    all = [sticker(1, 1000), sticker(2, 2000)]
  const r = legacy(a, all)
  r.history.find((t) => t.id === 'sticker:1').amount = 500
  r.balance -= 250
  a.settleStickerRewards(r, 'Mathias', all, now)
  assert.equal(r.balance, 1500)
  const trimmed = legacy(a, all)
  trimmed.history = []
  a.settleStickerRewards(trimmed, 'Mathias', all, now)
  assert.equal(trimmed.balance, 1500)
  // The first sticker is removed and the second edited; the existing distance record remains.
  a.settleStickerRewards(r, 'Mathias', [sticker(2, 100), sticker(3, 1700)], now)
  assert.equal(r.history.find((t) => t.id === 'sticker:3').amount, 250)
  assert.equal(r.stickerRewards.receipts['2'].distanceKm, 2000)
  assert.equal(a.publicEconomy(r).stickerRewards, undefined)
})

for (const remote of [false, true])
  test(`migration and future credits commit once across competing devices (${remote ? 'Redis CAS' : 'local queue'})`, async () => {
    const { api: a } = setup(remote),
      all = [sticker(1, 1000), sticker(2, 2000)]
    await a.mutateEconomy('Mathias', (r) => Object.assign(r, legacy(a, all)))
    await Promise.all(
      Array.from({ length: 8 }, () =>
        a.mutateEconomy('Mathias', (r) => a.settleStickerRewards(r, 'Mathias', all, now)),
      ),
    )
    let r = await a.readEconomy('Mathias')
    assert.equal(r.balance, 1500)
    assert.equal(r.history.filter((t) => t.id === 'sticker-country:v2').length, 1)
    const updated = [...all, sticker(3, 8000)]
    await Promise.all(
      Array.from({ length: 8 }, () =>
        a.mutateEconomy('Mathias', (r) => a.settleStickerRewards(r, 'Mathias', updated, now)),
      ),
    )
    r = await a.readEconomy('Mathias')
    assert.equal(r.balance, 5500)
    assert.equal(r.history.filter((t) => t.id === 'sticker:3').length, 1)
    assert.ok((await a.allEconomyRecords()).mathias.stickerRewards)
  })

test('public balances migrate inactive legacy owners once and never expose the private receipts', async () => {
  const { api: a } = setup()
  const all = [sticker(1, 1000), sticker(2, 2000)]
  await a.mutateEconomy('Mathias', (r) => Object.assign(r, legacy(a, all)))
  a.listStickers = async () => all.map((s) => ({ ...s, status: 'approved' }))
  a.publicSticker = (s) => s
  a.withDistance = (s) => s
  a.ratingsEnabled = false
  a.commentStats = async () => ({})
  const publicData = await a.publicEconomies()
  const saved = await a.readEconomy('Mathias')
  assert.equal(saved.history.find((t) => t.id === 'sticker-country:v2').amount, -500)
  assert.equal(publicData.mathias.balance, saved.balance)
  assert.equal(publicData.mathias.stickerRewards, undefined)
  await a.publicEconomies()
  assert.equal(
    (await a.readEconomy('Mathias')).history.filter((t) => t.id === 'sticker-country:v2').length,
    1,
  )
})
