import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { setup } from './helpers/economy-harness.mjs'

const harness = (remote = false) =>
  setup(remote, ['shared/utils/danish-keyboard.ts', 'server/utils/wordle.ts']).api
const day = '2026-11-16',
  now = new Date('2026-11-16T12:00:00Z')

test('Wordle consumes correct duplicates before awarding yellow letters', () => {
  const a = harness()
  assert.deepEqual(
    [...a.scoreWordle('AAAAA', 'BANAN')],
    ['absent', 'correct', 'absent', 'correct', 'absent'],
  )
  assert.deepEqual(
    [...a.scoreWordle('LILLE', 'BILER')],
    ['absent', 'correct', 'correct', 'absent', 'present'],
  )
  assert.deepEqual([...a.scoreWordle('BANAN', 'BANAN')], Array(5).fill('correct'))
  assert.equal(a.normalizeWordle(' æbler '), 'ÆBLER')
  const drafting = a.wordleRows(
    { guesses: [], marks: [], finished: false, won: false, reward: 0 },
    'CYKEL',
  )
  assert.equal(drafting[0].map((tile) => tile.letter).join(''), 'CYKEL')
  assert.equal(
    drafting[1].every((tile) => tile.letter === ''),
    true,
  )
})

test('Danish dictionary and curated answers stay on the server; keyboard has Danish mobile rows', () => {
  const a = harness()
  assert.equal(a.wordleAnswers.length, 29)
  assert.equal(a.wordleAnswers.length, new Set(a.wordleAnswers).size)
  assert.ok(a.wordleAnswers.every(a.isWordleWord))
  for (const word of ['NORSK', 'BAILE', 'YAPPE', 'LIMON', 'AFJOG', 'ZWIFT'])
    assert.equal(a.isWordleWord(word), true)
  for (const word of ['CYKEL', 'BANAN', 'BILER', 'ÆBLER', 'SØGER'])
    assert.equal(a.isWordleWord(word), true)
  assert.equal(a.isWordleWord('ZZZZZ'), false)
  assert.deepEqual([...a.DANISH_KEY_ROWS], ['QWERTYUIOPÅ', 'ASDFGHJKLÆØ', 'ZXCVBNM'])
  assert.ok(readFileSync('app/components/CrosswordBoard.vue', 'utf8').includes('DANISH_KEY_ROWS'))
})

for (const remote of [false, true]) {
  test(`same daily answer for everyone, persisted and without near-term repeats (${remote ? 'Redis' : 'local'})`, async () => {
    const a = harness(remote)
    const first = await a.dailyWordleAnswer(day)
    assert.equal(await a.dailyWordleAnswer(day), first)
    assert.equal(a.isWordleWord(first), true)
    const answers = []
    for (let i = 0; i < 30; i++)
      answers.push(
        await a.dailyWordleAnswer(
          new Date(Date.parse(day + 'T12:00:00Z') + i * 86400000).toISOString().slice(0, 10),
        ),
      )
    assert.equal(new Set(answers).size, 30)
    assert.notEqual(answers[0], answers[29])
  })

  test(`concurrent devices and retry award a win once and preserve other daily games (${remote ? 'Redis CAS' : 'local'})`, async () => {
    const a = harness(remote)
    await a.mutateEconomy('Test', (r) => {
      r.balance = 250
      r.days[day] = { wheel: { prize: 1 } }
    })
    await Promise.all(
      Array.from({ length: 8 }, () =>
        a.mutateEconomy('Test', (r) => a.applyWordleGuess(r, day, 'BANAN', 0, 'BANAN', now)),
      ),
    )
    const r = await a.readEconomy('Test')
    assert.equal(r.balance, 300)
    assert.equal(r.history.length, 1)
    assert.deepEqual([...r.days[day].wordle.guesses], ['BANAN'])
    assert.equal(r.days[day].wheel.prize, 1)
    assert.equal(a.wordleView(r, day, 'BANAN').answer, 'BANAN')
    assert.equal(a.wordleView(a.freshEconomy(), day, 'BANAN').answer, undefined)
  })
}

test('all six reward tiers, rejected words, six failed attempts and stale device revision', () => {
  const a = harness()
  const misses = ['BILER', 'CYKEL', 'HYGGE', 'FROST', 'ÆBLER', 'PENGE']
  for (let attempt = 0; attempt < 6; attempt++) {
    const r = a.freshEconomy()
    for (let i = 0; i < attempt; i++) a.applyWordleGuess(r, day, misses[i], i, 'BANAN', now)
    a.applyWordleGuess(r, day, 'BANAN', attempt, 'BANAN', now)
    assert.equal(r.balance, [50, 40, 30, 20, 15, 10][attempt])
    assert.equal(r.history.length, 1)
  }
  const r = a.freshEconomy()
  assert.throws(() => a.applyWordleGuess(r, day, 'ZZZZZ', 0, 'BANAN', now), { statusCode: 400 })
  assert.equal(r.days[day], undefined)
  a.applyWordleGuess(r, day, 'BILER', 0, 'BANAN', now)
  assert.throws(() => a.applyWordleGuess(r, day, 'CYKEL', 0, 'BANAN', now), { statusCode: 409 })
  assert.throws(() => a.applyWordleGuess(r, day, 'BILER', 1, 'BANAN', now), { statusCode: 400 })
  for (let i = 1; i < 6; i++) a.applyWordleGuess(r, day, misses[i], i, 'BANAN', now)
  assert.equal(r.days[day].wordle.finished, true)
  assert.equal(r.days[day].wordle.won, false)
  assert.equal(r.balance, 0)
  assert.equal(a.wordleView(r, day, 'BANAN').answer, 'BANAN')
  a.applyWordleGuess(r, day, 'BANAN', 6, 'BANAN', now)
  assert.equal(r.balance, 0)
})

test('04:00 Danish day boundary rejects yesterday, including daylight saving changes', () => {
  const a = harness()
  for (const [yesterday, instant] of [
    ['2026-11-15', '2026-11-16T03:00:00Z'],
    ['2026-03-28', '2026-03-29T02:00:00Z'],
    ['2026-10-24', '2026-10-25T03:00:00Z'],
  ]) {
    const r = a.freshEconomy()
    assert.throws(() => a.applyWordleGuess(r, yesterday, 'BANAN', 0, 'BANAN', new Date(instant)), {
      statusCode: 409,
    })
    assert.equal(Object.keys(r.days).length, 0)
  }
})
