import assert from 'node:assert/strict'
import test from 'node:test'
import { setup } from './helpers/economy-harness.mjs'

test('Christmas navigation counts previews while keeping individual unlock dates', () => {
  const { api: a } = setup(false, ['shared/utils/christmas-games.ts'])
  for (const [stamp, visible, calendar] of [
    ['2026-10-31T12:00:00Z', false, false],
    ['2026-11-01T02:59:59Z', false, false],
    ['2026-11-01T03:00:00Z', true, false],
    ['2026-11-11T12:00:00Z', true, false],
    ['2026-11-24T02:59:59Z', true, false],
    ['2026-11-24T03:00:00Z', true, true],
    ['2026-12-31T22:59:59Z', true, true],
    ['2026-12-31T23:00:00Z', false, false],
    ['2027-02-01T12:00:00Z', false, false],
  ]) {
    const result = a.christmasGames(new Date(stamp))
    assert.equal(result.visible, visible, stamp)
    assert.equal(result.calendar, calendar, stamp)
    assert.equal(result.boxes, visible, stamp)
  }
  assert.equal(a.christmasGames(new Date('2026-11-24T03:00:00Z')).calendarOpen, false)
  assert.equal(a.christmasGames(new Date('2026-12-01T03:00:00Z')).calendarOpen, true)
  assert.equal(a.christmasGames(new Date('2026-11-20T02:59:59Z')).boxesOpen, false)
  assert.equal(a.christmasGames(new Date('2026-11-20T03:00:00Z')).boxesOpen, true)
})

test('Christmas navigation remains available only through the actual January collection deadline', () => {
  const { api: a } = setup(false, ['shared/utils/christmas-games.ts'])
  const campaign = { phase: 'ended', collectionUntil: '2027-01-08T12:00:00Z' }
  const before = a.christmasGames(new Date('2027-01-08T11:59:59Z'), campaign)
  assert.equal(before.visible, true)
  assert.equal(before.parcels, true)
  assert.equal(before.boxes, false)
  assert.equal(before.calendar, false)
  assert.equal(a.christmasGames(new Date(campaign.collectionUntil), campaign).visible, false)
  assert.equal(
    a.christmasGames(new Date('2027-01-01T12:00:00Z'), { ...campaign, phase: 'archived' }).visible,
    false,
  )
  assert.equal(
    a.christmasGames(new Date('2027-01-01T12:00:00Z'), { ...campaign, cancelled: true }).visible,
    false,
  )
})
