import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { setup } from './helpers/economy-harness.mjs'
const harness = (remote) =>
  setup(remote, ['server/utils/wordle-draw.ts', 'server/utils/wordle.ts']).api
const dictionary = JSON.parse(readFileSync('server/data/wordle-allowed.json', 'utf8'))
const nextDay = (i) =>
  new Date(Date.parse('2026-11-16T12:00:00Z') + i * 86400000).toISOString().slice(0, 10)

test('exact 80/20 split and all 29 reference words are legal guesses', () => {
  const a = harness(false),
    refs = new Set(a.wordleAnswers)
  assert.equal(refs.size, 29)
  for (const word of ['SPONS', 'KUDOS']) assert.equal(a.isWordleWord(word), true)
  let referencePicks = 0
  for (let ticket = 0; ticket < 10000; ticket++)
    if (refs.has(a.selectWordleAnswer(new Set(), ticket, 0))) referencePicks++
  assert.equal(referencePicks, 8000)
  assert.equal(refs.has(a.selectWordleAnswer(new Set(), 7999, 17)), true)
  assert.equal(refs.has(a.selectWordleAnswer(new Set(), 8000, 17)), false)
})

test('used words are excluded from both pools; empty pool falls back without recycling', () => {
  const a = harness(false),
    refs = new Set(a.wordleAnswers)
  const used = new Set(refs)
  const other = a.selectWordleAnswer(used, 0, 0)
  assert.equal(refs.has(other), false)
  assert.equal(dictionary.includes(other), true)
  used.add(other)
  assert.notEqual(a.selectWordleAnswer(used, 9999, 0), other)
  const noGeneral = new Set([...dictionary, ...refs])
  noGeneral.delete('ZWIFT')
  assert.equal(a.selectWordleAnswer(noGeneral, 9999, 0), 'ZWIFT')
  assert.throws(() => a.selectWordleAnswer(new Set([...dictionary, ...refs]), 0, 0), {
    statusCode: 503,
  })
})

for (const remote of [false, true]) {
  test(`permanent history avoids repeats beyond the old 27-day cycle and 40-day expiry (${remote ? 'Redis CAS' : 'local'})`, async () => {
    const a = harness(remote),
      answers = []
    for (let i = 0; i < 120; i++) answers.push(await a.dailyWordleAnswer(nextDay(i)))
    assert.equal(new Set(answers).size, 120)
    assert.equal(await a.dailyWordleAnswer(nextDay(0)), answers[0])
    const history = await a.readWordleHistory()
    assert.equal(history.used.length, 120)
    assert.equal(Object.keys(history.days).length, 120)
    assert.equal(new Set(history.used).size, 120)
    const backup = await a.gameBackup()
    assert.equal(backup.wordle.used.length, 120)
  })

  test(`concurrent requests and different days reserve each answer only once (${remote ? 'Redis CAS' : 'local'})`, async () => {
    const a = harness(remote)
    const same = await Promise.all(
      Array.from({ length: 16 }, () => a.dailyWordleAnswer(nextDay(0))),
    )
    assert.equal(new Set(same).size, 1)
    assert.equal((await a.readWordleHistory()).used.length, 1)
    const rest = await Promise.all(
      Array.from({ length: 10 }, (_, i) => a.dailyWordleAnswer(nextDay(i + 1))),
    )
    assert.equal(new Set([...rest, same[0]]).size, 11)
    assert.equal((await a.readWordleHistory()).used.length, 11)
  })

  test(`legacy draws are retained and all known previously used words are excluded (${remote ? 'Redis' : 'local'})`, async () => {
    const a = harness(remote)
    async function save(key, value) {
      if (remote) await a.redis([['SET', key, value]])
      else await a.useStorage('data').setItem(key, value)
    }
    await save('games:wordle:2026-11-16', 'FUGLE')
    await save('games:wordle:references-v1:2026-11-16', 'CYKEL')
    await save('games:wordle:references-v1:2026-11-17', 'NORSK')
    assert.equal(await a.dailyWordleAnswer('2026-11-17'), 'NORSK')
    assert.equal(await a.dailyWordleAnswer('2026-11-16'), 'CYKEL')
    const history = await a.readWordleHistory()
    for (const word of ['FUGLE', 'CYKEL', 'NORSK']) assert.equal(history.used.includes(word), true)
    assert.equal(
      ['FUGLE', 'CYKEL', 'NORSK'].includes(await a.dailyWordleAnswer('2026-11-18')),
      false,
    )
  })
}
