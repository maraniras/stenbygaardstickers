import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import vm from 'node:vm'
import test from 'node:test'
import ts from 'typescript'
import { setup } from './helpers/economy-harness.mjs'

const game = (redis = false) => setup(redis, ['server/utils/crossword.ts'])
const now = new Date('2026-11-20T12:00:00Z')
const opened = (a) => ({ ...a.freshCrossword(), opensAt: '2026-11-20T11:00:00Z' })

test('crossword is closed by default and cannot expose clues or accept solutions early', () => {
  const { api: a } = game()
  const state = a.freshCrossword()
  const view = a.crosswordView(state, 'Mathias', false, now)
  assert.equal(view.open, false)
  assert.equal(view.puzzle, undefined)
  assert.equal(view.winner, null)
  assert.throws(
    () => a.submitCrossword(state, 'Mathias', a.crosswordSolution(), now),
    (e) => e.statusCode === 403,
  )
  a.scheduleCrossword(state, '2026-11-21T10:00', now)
  assert.equal(state.opensAt, '2026-11-21T09:00:00.000Z')
  assert.equal(
    a.crosswordView(state, undefined, false, new Date('2026-11-21T08:59:59.999Z')).puzzle,
    undefined,
  )
  const open = a.crosswordView(state, undefined, false, new Date(state.opensAt))
  assert.equal(open.open, true)
  assert.equal(open.puzzle.entries.length, 104)
  assert.ok(open.puzzle.entries.every((entry) => !('answer' in entry) && entry.length > 0))
  assert.ok(!JSON.stringify(open).includes('ALDERSPRÆSIDENT'))
})

test('schedule uses Danish DST, rejects invalid times, and cannot reset an opened competition', () => {
  const { api: a } = game()
  assert.equal(a.crosswordOpeningTime('2027-07-01T10:00'), '2027-07-01T08:00:00.000Z')
  assert.equal(a.crosswordOpeningTime('2027-01-01T10:00'), '2027-01-01T09:00:00.000Z')
  assert.throws(() => a.crosswordOpeningTime('2027-03-28T02:30'))
  assert.throws(() => a.crosswordOpeningTime('2027-02-31T10:00'))
  assert.throws(
    () => a.scheduleCrossword(a.freshCrossword(), '2026-11-19T10:00', now),
    (e) => e.statusCode === 400,
  )
  assert.throws(
    () => a.scheduleCrossword(opened(a), null, now),
    (e) => e.statusCode === 409,
  )
  assert.throws(
    () => a.scheduleCrossword(a.freshCrossword(), undefined, now),
    (e) => e.statusCode === 400,
  )
})

test('only complete submissions are checked, with no per-cell hints and no reward for a wrong solution', () => {
  const { api: a } = game()
  const correct = a.crosswordSolution()
  assert.throws(
    () => a.validateCrosswordAnswers({}),
    (e) => e.statusCode === 400,
  )
  assert.throws(
    () => a.validateCrosswordAnswers({ ...correct, secret: 'A' }),
    (e) => e.statusCode === 400,
  )
  const wrong = { ...correct }
  const key = Object.keys(wrong)[0]
  wrong[key] = wrong[key] === 'A' ? 'B' : 'A'
  const state = opened(a)
  assert.equal(a.submitCrossword(state, 'Nicole', wrong, now), false)
  assert.equal(state.winner, null)
  assert.throws(
    () => a.submitCrossword(state, 'Nicole', correct, now),
    (e) => e.statusCode === 429,
  )
  assert.equal(a.submitCrossword(state, 'Nicole', correct, new Date(now.getTime() + 2000)), true)
})

for (const redis of [false, true])
  test(`one winner and exactly 500 bananas under concurrent correct submissions and payout retries (${redis ? 'Redis CAS' : 'local queue'})`, async () => {
    const { api: a } = game(redis)
    await a.mutateCrossword((state) => {
      state.opensAt = '2026-11-20T11:00:00Z'
    })
    const answers = a.crosswordSolution()
    const names = Array.from({ length: 20 }, (_, i) => `Spiller ${i}`)
    await Promise.all(
      names.map((name) =>
        a.mutateCrossword((state) => a.submitCrossword(state, name, answers, now)),
      ),
    )
    const state = await a.readCrossword()
    assert.equal(Object.keys(state.finished).length, 20)
    assert.ok(names.includes(state.winner.name))
    // Simulate a process stopping after committing the winner, then many readers retrying payment.
    assert.equal(await a.readEconomy(state.winner.name), undefined)
    await Promise.all(Array.from({ length: 20 }, () => a.settleCrosswordWinner(state)))
    const records = await a.allEconomyRecords()
    assert.equal(Object.keys(records).length, 1)
    const wallet = records[state.winner.name.toLocaleLowerCase('da')]
    assert.equal(wallet.balance, 500)
    assert.equal(wallet.history.length, 1)
    assert.equal(wallet.crosswordWins['1'], state.winner.at)
    const badges = a.badgesFor(
      state.winner.name,
      [],
      {},
      { economy: { [state.winner.name.toLocaleLowerCase('da')]: a.publicEconomy(wallet) } },
    )
    const badge = badges.find((b) => b.id === 'crossword-1-winner')
    assert.equal(badge.earned, true)
    assert.equal(badge.points, 1)
    assert.equal(a.bananaRewardFor(badge), 0, 'No second badge payment above the 500 prize')
    const loser = names.find((name) => name !== state.winner.name)
    assert.equal(a.crosswordView(state, loser, false, now).completed, true)
    assert.equal(a.crosswordView(state, loser, false, now).winner.name, state.winner.name)
    assert.equal(await a.readEconomy(loser), undefined)
    await a.mutateCrossword((s) => a.submitCrossword(s, state.winner.name, answers, now))
    assert.equal((await a.readEconomy(state.winner.name)).balance, 500)
  })

function route(a, file) {
  const exports = {}
  const code = ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  a.defineEventHandler = (handler) => handler
  a.getQuery = (event) => event.query || {}
  a.setHeader = () => {}
  a.requireAdmin = (event) => {
    if (!event.admin) throw Object.assign(new Error('Admin required'), { statusCode: 401 })
  }
  a.userForToken = async () => undefined
  a.readToken = () => ''
  a.readBody = async (event) => event.body
  a.economyUser = async (event) => {
    if (!event.name) throw Object.assign(new Error('User required'), { statusCode: 401 })
    return { user: { name: event.name } }
  }
  a.syncBadgesLater = async () => {}
  vm.runInContext(`(function(exports){${code}\n})`, a)(exports)
  return exports.default
}

test('both preview routes require admin; preview validation changes no winner, wallet or completion', async () => {
  const { api: a } = game()
  const get = route(a, 'server/api/games/crossword.get.ts')
  const post = route(a, 'server/api/games/crossword.post.ts')
  await assert.rejects(get({ query: { preview: '1' } }), (e) => e.statusCode === 401)
  await assert.rejects(
    post({ query: { preview: '1' }, body: { answers: a.crosswordSolution() } }),
    (e) => e.statusCode === 401,
  )
  const view = await get({ query: { preview: '1' }, admin: true })
  assert.equal(view.preview, true)
  assert.equal(view.open, false)
  assert.ok(view.puzzle)
  const result = await post({
    query: { preview: '1' },
    admin: true,
    body: { answers: a.crosswordSolution() },
  })
  assert.equal(result.correct, true)
  assert.equal((await a.readCrossword()).winner, null)
  assert.equal(Object.keys((await a.readCrossword()).finished).length, 0)
  assert.equal(Object.keys(await a.allEconomyRecords()).length, 0)
  assert.equal((await get({})).puzzle, undefined)
})

test('normal submission requires a user and ignores client-supplied winner identity', async () => {
  const { api: a } = game()
  const post = route(a, 'server/api/games/crossword.post.ts')
  await assert.rejects(post({ body: {} }), (e) => e.statusCode === 401)
  await a.mutateCrossword((state) => {
    state.opensAt = '2020-01-01T00:00:00Z'
  })
  const result = await post({
    name: 'Nicole',
    body: { name: 'Mathias', answers: a.crosswordSolution() },
  })
  assert.equal(result.view.winner.name, 'Nicole')
  assert.equal((await a.readEconomy('Nicole')).balance, 500)
  assert.equal(await a.readEconomy('Mathias'), undefined)
})

test('answer key requires admin, is not cached and changes no competition or wallet', async () => {
  const { api: a } = game()
  const answerKey = route(a, 'server/api/admin/crossword/solution.get.ts')
  const headers = {}
  a.setHeader = (_event, name, value) => {
    headers[name] = value
  }
  assert.throws(
    () => answerKey({}),
    (e) => e.statusCode === 401,
  )
  const before = JSON.stringify(await a.readCrossword())
  const response = answerKey({ admin: true })
  assert.equal(headers['Cache-Control'], 'private, no-store')
  assert.deepEqual(response.solution, a.crosswordSolution())
  assert.equal(response.puzzle.entries.length, 104)
  assert.ok(response.puzzle.entries.every((entry) => !('answer' in entry)))
  assert.equal(JSON.stringify(await a.readCrossword()), before)
  assert.equal(Object.keys(await a.allEconomyRecords()).length, 0)
  const publicRoute = route(a, 'server/api/games/crossword.get.ts')
  const preview = await publicRoute({ admin: true, query: { preview: '1' } })
  assert.equal(preview.solution, undefined)
  assert.ok(preview.puzzle.entries.every((entry) => !('answer' in entry)))
})

test('answer definition is server-only; public board consumes lengths, not answers', () => {
  assert.equal(existsSync('app/data/crossword-preview.ts'), false)
  const board = readFileSync('app/components/CrosswordBoard.vue', 'utf8')
  assert.ok(!board.includes('.answer'))
  assert.ok(!board.includes('server/data'))
  assert.ok(!board.includes('CROSSWORD_PREVIEW'))
  const menu = readFileSync('app/pages/spil/oevrige.vue', 'utf8')
  assert.ok(!menu.includes("'B',"))
})

test('help starts on opening date plus two at 04:00 Copenhagen, including year changes and DST', () => {
  const { api: a } = game()
  for (const [opening, expected] of [
    ['2026-11-16T13:00:00Z', '2026-11-18T03:00:00.000Z'],
    ['2026-11-15T23:00:00Z', '2026-11-18T03:00:00.000Z'],
    ['2026-11-16T23:00:00Z', '2026-11-19T03:00:00.000Z'],
    ['2026-12-31T12:00:00Z', '2027-01-02T03:00:00.000Z'],
    ['2027-03-26T12:00:00Z', '2027-03-28T02:00:00.000Z'],
    ['2027-10-29T12:00:00Z', '2027-10-31T03:00:00.000Z'],
  ]) {
    const state = { ...a.freshCrossword(), opensAt: opening }
    assert.equal(a.crosswordHelpAt(state), expected)
    assert.equal(
      a.crosswordView(state, undefined, false, new Date(Date.parse(expected) - 1)).helpAvailable,
      false,
    )
    assert.equal(a.crosswordView(state, undefined, false, new Date(expected)).helpAvailable, true)
  }
  assert.equal(a.crosswordHelpAt(a.freshCrossword()), null)
})

test('daily help checks saved letters at 04:00, stays fixed during the day and stops after completion', () => {
  const { api: a } = game()
  const state = { ...a.freshCrossword(), opensAt: '2026-11-16T13:00:00Z' }
  const solution = a.crosswordSolution()
  const [first, second] = Object.keys(solution)
  const wrong = solution[second] === 'A' ? 'B' : 'A'
  const before = new Date('2026-11-18T02:59:59Z')
  const after = new Date('2026-11-18T03:00:00Z')
  const subject = 'u:mathias'
  const early = a.crosswordHelp(
    state,
    subject,
    { [first]: solution[first], [second]: wrong },
    before,
  )
  assert.equal(early.available, false)
  assert.equal(Object.keys(early.correctLetters).length, 0)
  const daily = a.crosswordHelp(
    state,
    subject,
    { [first]: solution[first], [second]: solution[second] },
    after,
  )
  assert.equal(daily.checkedDay, '2026-11-18')
  assert.equal(daily.correctLetters[first], solution[first])
  assert.equal(daily.correctLetters[second], undefined, 'edits after reset wait for tomorrow')
  assert.equal(Object.keys(daily.correctLetters).length, 1)
  const retry = a.crosswordHelp(
    state,
    subject,
    { [first]: solution[first], [second]: solution[second] },
    new Date('2026-11-19T02:59:59Z'),
  )
  assert.deepEqual(retry.correctLetters, daily.correctLetters)
  const tomorrow = a.crosswordHelp(state, subject, {}, new Date('2026-11-19T03:00:00Z'))
  assert.equal(tomorrow.correctLetters[second], solution[second])
  assert.equal(tomorrow.checkedDay, '2026-11-19')
  state.finished[subject] = { name: 'Mathias', at: '2026-11-19T12:00:00Z' }
  const completed = a.crosswordHelp(state, subject, {}, new Date('2026-11-20T03:00:00Z'))
  assert.equal(completed.checkedDay, '2026-11-19')
  assert.equal(completed.nextAt, null)
  assert.deepEqual(completed.correctLetters, tomorrow.correctLetters)
  assert.equal(state.winner, null)
})

test('help reset follows 04:00 through the 23-hour daylight-saving day', () => {
  const { api: a } = game()
  const state = { ...a.freshCrossword(), opensAt: '2027-03-25T12:00:00Z' }
  const first = a.crosswordHelp(state, 'd:device-a', {}, new Date('2027-03-27T03:00:00Z'))
  assert.equal(first.nextAt, '2027-03-28T02:00:00.000Z')
  const next = a.crosswordHelp(state, 'd:device-a', {}, new Date(first.nextAt))
  assert.equal(next.checkedDay, '2027-03-28')
  assert.equal(next.nextAt, '2027-03-29T02:00:00.000Z')
})

test('help rejects closed games and invalid fields without revealing letters', () => {
  const { api: a } = game()
  assert.throws(
    () => a.crosswordHelp(a.freshCrossword(), 'u:mathias', {}, now),
    (e) => e.statusCode === 403,
  )
  const state = opened(a)
  for (const answers of [null, [], { unknown: 'A' }, { toString: 'A' }, { '2:6': 'ABC' }])
    assert.throws(
      () => a.crosswordHelp(state, 'u:mathias', answers, now),
      (e) => e.statusCode === 400,
    )
  const empty = a.crosswordHelp(state, 'u:mathias', {}, new Date('2026-11-23T03:00:00Z'))
  assert.equal(Object.keys(empty.correctLetters).length, 0)
  assert.equal('solution' in empty, false)
})

for (const redis of [false, true])
  test(`simultaneous daily help requests cannot retry correctness and do not award prizes (${redis ? 'Redis CAS' : 'local queue'})`, async () => {
    const { api: a } = game(redis)
    const solution = a.crosswordSolution()
    const cell = Object.keys(solution)[0]
    await a.mutateCrossword((state) => {
      state.opensAt = '2026-11-16T13:00:00Z'
      a.crosswordHelp(
        state,
        'u:mathias',
        { [cell]: solution[cell] },
        new Date('2026-11-17T12:00:00Z'),
      )
    })
    const responses = await Promise.all(
      Array.from({ length: 12 }, (_, i) =>
        a.mutateCrossword((state) =>
          a.crosswordHelp(
            state,
            'u:mathias',
            { [cell]: i % 2 ? 'Z' : solution[cell] },
            new Date('2026-11-18T03:00:00Z'),
          ),
        ),
      ),
    )
    for (const response of responses)
      assert.equal(response.result.correctLetters[cell], solution[cell])
    const state = await a.readCrossword()
    assert.equal(state.progress['u:mathias'].checkedDay, '2026-11-18')
    assert.equal(Object.keys(state.finished).length, 0)
    assert.equal(state.winner, null)
    assert.equal(Object.keys(await a.allEconomyRecords()).length, 0)
  })

test('help route ignores client day/time and keeps device feedback private', async () => {
  const { api: a } = game()
  await a.mutateCrossword((state) => {
    state.opensAt = new Date(Date.now() - 1000).toISOString()
  })
  const help = route(a, 'server/api/games/crossword/help.post.ts')
  const solution = a.crosswordSolution()
  const cell = Object.keys(solution)[0]
  const result = await help({
    body: {
      device: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      answers: { [cell]: solution[cell] },
      day: '2999-01-01',
      now: '2999-01-01',
    },
  })
  assert.equal(result.available, false)
  assert.equal(Object.keys(result.correctLetters).length, 0)
  await assert.rejects(help({ body: { answers: {} } }), (e) => e.statusCode === 400)
  await a.mutateCrossword((state) => {
    state.opensAt = '2020-01-01T00:00:00Z'
  })
  const other = await help({
    body: { device: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', answers: {} },
  })
  assert.equal(other.available, true)
  assert.equal(Object.keys(other.correctLetters).length, 0)
})

test('leaderboard counts filled words and unique letters before help, includes started players and hides private data', () => {
  const { api: a } = game()
  const state = { ...a.freshCrossword(), opensAt: '2026-11-16T13:00:00Z' }
  const beforeHelp = new Date('2026-11-17T12:00:00Z')
  const word = a.CROSSWORD_PREVIEW[0]
  const cells = [...word.answer].map((value, i) => [`${word.row}:${word.col + i}`, value])
  const firstWord = Object.fromEntries(cells)
  const incorrectWord = Object.fromEntries(cells.map(([cell]) => [cell, 'Z']))
  a.crosswordHelp(state, 'u:mathias', incorrectWord, beforeHelp)
  a.crosswordHelp(state, 'u:nicole', firstWord, beforeHelp)
  a.crosswordHelp(
    state,
    'd:private-device-123456789',
    Object.fromEntries(cells.slice(0, 3)),
    beforeHelp,
  )
  a.crosswordHelp(state, 'u:just-opened', {}, beforeHelp)
  state.finished['u:tobias'] = { name: 'Tobias', at: '2026-11-17T11:00:00Z' }
  state.winner = state.finished['u:tobias']
  const before = JSON.stringify(state)
  const result = a.crosswordLeaderboard(
    state,
    [{ name: 'Mathias' }, { name: 'Nicole' }, { name: 'Tobias' }],
    beforeHelp,
  )
  assert.equal(result.mode, 'filled')
  assert.equal(result.totalWords, 104)
  assert.equal(result.totalLetters, Object.keys(a.crosswordSolution()).length)
  assert.equal(result.players.length, 4)
  const mathias = result.players.find((row) => row.name === 'Mathias')
  assert.equal(mathias.words, 1, 'filled words do not imply correct words before help')
  assert.equal(mathias.letters, 7)
  assert.equal(result.players[0].name, 'Tobias')
  assert.equal(result.players[0].winner, true)
  assert.equal(result.players[0].words, result.totalWords)
  assert.equal(result.players[0].letters, result.totalLetters)
  const anonymous = result.players.find((row) => row.name === null)
  assert.equal(anonymous.label, 'Anonym 1')
  assert.equal(anonymous.letters, 3)
  assert.equal(anonymous.words, 0)
  assert.ok(!JSON.stringify(result).includes('private-device'))
  assert.ok(!JSON.stringify(result).includes('IKONISK'))
  assert.ok(!JSON.stringify(result).includes('correctLetters'))
  assert.equal(JSON.stringify(state), before, 'reading the board must not mutate the game')
  a.crosswordHelp(state, 'u:mathias', {}, beforeHelp)
  assert.equal(
    a
      .crosswordLeaderboard(state, [{ name: 'Mathias' }], beforeHelp)
      .players.find((row) => row.name === 'Mathias').letters,
    0,
    'a participant remains listed after clearing their cells',
  )
})

test('leaderboard switches to daily correct counts with no live correctness feedback', () => {
  const { api: a } = game()
  const state = { ...a.freshCrossword(), opensAt: '2026-11-16T13:00:00Z' }
  const solution = a.crosswordSolution()
  const word = a.CROSSWORD_PREVIEW[0]
  const cells = [...word.answer].map((value, i) => [`${word.row}:${word.col + i}`, value])
  const wordWrong = Object.fromEntries(cells)
  wordWrong[cells[2][0]] = 'X'
  a.crosswordHelp(state, 'u:mathias', wordWrong, new Date('2026-11-17T12:00:00Z'))
  const after = new Date('2026-11-18T03:00:00Z')
  a.crosswordHelp(state, 'u:mathias', Object.fromEntries(cells), after)
  let result = a.crosswordLeaderboard(state, [{ name: 'Mathias' }], after)
  assert.equal(result.mode, 'correct')
  assert.equal(result.players[0].letters, 6)
  assert.equal(result.players[0].words, 0)
  a.crosswordHelp(state, 'u:mathias', Object.fromEntries(cells), new Date('2026-11-18T12:00:00Z'))
  assert.equal(
    a.crosswordLeaderboard(state, [{ name: 'Mathias' }], new Date('2026-11-18T12:00:00Z'))
      .players[0].letters,
    6,
  )
  const before = JSON.stringify(state)
  result = a.crosswordLeaderboard(state, [{ name: 'Mathias' }], new Date('2026-11-19T03:00:00Z'))
  assert.equal(
    result.players[0].letters,
    7,
    'offline participants receive the next daily projection',
  )
  assert.equal(result.players[0].words, 1)
  assert.equal(JSON.stringify(state), before)
  assert.ok(!JSON.stringify(result).includes(JSON.stringify(solution)))
})

test('a full wrong submission cannot refresh the daily correctness snapshot through the leaderboard', () => {
  const { api: a } = game()
  const state = { ...a.freshCrossword(), opensAt: '2026-11-16T13:00:00Z' }
  const solution = a.crosswordSolution()
  const cell = Object.keys(solution)[0]
  a.crosswordHelp(state, 'u:mathias', { [cell]: solution[cell] }, new Date('2026-11-17T12:00:00Z'))
  const wrong = { ...solution }
  const last = Object.keys(wrong).at(-1)
  wrong[last] = wrong[last] === 'A' ? 'B' : 'A'
  const after = new Date('2026-11-18T12:00:00Z')
  assert.equal(a.submitCrossword(state, 'Mathias', wrong, after), false)
  assert.equal(a.crosswordLeaderboard(state, [{ name: 'Mathias' }], after).players[0].letters, 1)
  const tomorrow = a.crosswordLeaderboard(
    state,
    [{ name: 'Mathias' }],
    new Date('2026-11-19T03:00:00Z'),
  )
  assert.equal(tomorrow.players[0].letters, Object.keys(solution).length - 1)
})

test('leaderboard route stays locked before opening, including direct links; admin preview is read-only', async () => {
  const { api: a } = game()
  const get = route(a, 'server/api/games/crossword/leaderboard.get.ts')
  let userReads = 0
  a.listUsers = async () => {
    userReads++
    return [{ name: 'Mathias' }]
  }
  await assert.rejects(get({}), (e) => e.statusCode === 403)
  await assert.rejects(get({ query: { preview: '1' } }), (e) => e.statusCode === 401)
  assert.equal(userReads, 0)
  const preview = await get({ admin: true, query: { preview: '1' } })
  assert.equal(preview.players.length, 0)
  assert.equal((await a.readCrossword()).opensAt, null)
  await a.mutateCrossword((state) => {
    state.opensAt = '2020-01-01T00:00:00Z'
  })
  const publicView = await get({})
  assert.equal(publicView.totalWords, 104)
  assert.equal(publicView.mode, 'correct')
  assert.equal(Object.keys(await a.allEconomyRecords()).length, 0)
})
