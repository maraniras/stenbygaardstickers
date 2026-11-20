import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { setup } from './helpers/economy-harness.mjs'

function ratings() {
  const hashes = new Map(
    Array.from({ length: 20 }, (_, i) => [
      `rating:s${i}`,
      new Map([
        ['u:mathias', '5'],
        ['phone', '3'],
        ['other', '1'],
      ]),
    ]),
  )
  hashes.set('rating:empty', new Map())
  const commands = []
  const context = {
    exports: {},
    redisEnabled: true,
    redis: async (list) =>
      list.map((command) => {
        commands.push(command)
        const [cmd, key, ...args] = command
        if (cmd === 'SMEMBERS') return [...hashes.keys()].map((k) => k.slice(7))
        const hash = hashes.get(key)
        if (cmd === 'HVALS') return [...hash.values()]
        if (cmd === 'HMGET') return args.map((k) => hash.get(k) ?? null)
        if (cmd === 'HDEL') {
          for (const k of args) hash.delete(k)
          return 1
        }
        if (cmd === 'HSET') {
          hash.set(args[0], args[1])
          return 1
        }
        throw Error(cmd)
      }),
  }
  vm.runInNewContext(
    ts.transpileModule(
      readFileSync('server/utils/ratings.ts', 'utf8').replace('import.meta.dev', 'false'),
      { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
    ).outputText,
    context,
  )
  return { api: context.exports, commands, hashes }
}

test('rating summaries omit pointless personal lookups and preserve exact totals', async () => {
  const h = ratings()
  const result = await h.api.getRatings()
  assert.equal(Object.keys(result).length, 20)
  assert.equal(result.s0.avg, 3)
  assert.equal(result.s0.count, 3)
  assert.equal(result.s0.mine, undefined)
  assert.equal(result.empty, undefined)
  // Twenty nonempty and one empty sticker: before 64 commands, now 22.
  assert.equal(h.commands.length, 22)
  assert.ok(h.commands.every(([cmd]) => cmd === 'SMEMBERS' || cmd === 'HVALS'))
})

test('ratings retain user precedence, device fallback and privacy with one HMGET', async () => {
  for (const [voter, mine] of [
    [{ userKey: 'mathias', device: 'phone' }, 5],
    [{ userKey: 'new', device: 'phone' }, 3],
    [{ userKey: 'mathias' }, 5],
    [{ device: 'phone' }, 3],
    [{ device: 'missing' }, undefined],
  ]) {
    const h = ratings(),
      result = await h.api.getRatings(voter)
    assert.equal(result.s0.mine, mine)
    assert.equal(result.s0.avg, 3)
    assert.equal(h.commands.length, 43)
    assert.deepEqual(Object.keys(result.s0).sort(), ['avg', 'count', 'mine'])
  }
})

test('rating claim keeps existing user votes and drops votes on own stickers', async () => {
  const h = ratings()
  h.hashes.get('rating:s2').delete('u:mathias')
  const moved = await h.api.claimRatings('phone', 'mathias', new Set(['s1']))
  assert.equal(moved, 1)
  assert.equal(h.hashes.get('rating:s0').get('u:mathias'), '5')
  assert.equal(h.hashes.get('rating:s1').has('phone'), false)
  assert.equal(h.hashes.get('rating:s2').get('u:mathias'), '3')
  assert.equal(h.commands.filter(([cmd]) => cmd === 'HMGET').length, 21)
  assert.equal(h.commands.filter(([cmd]) => cmd === 'HGET').length, 0)
})

test('unchanged economy sync avoids writes while real credits still commit once', async () => {
  const h = setup(true),
    a = h.api
  let commits = 0
  const commit = a.redisEval
  a.redisEval = async (...args) => {
    commits++
    return commit(...args)
  }
  const context = { stickers: [], ratings: {}, comments: {} }
  const first = await a.syncEconomy('Test', context)
  assert.ok(commits > 0)
  commits = 0
  const same = await a.syncEconomy('Test', context)
  assert.equal(JSON.stringify(same), JSON.stringify(first))
  assert.equal(commits, 0)
  await Promise.all(
    Array.from({ length: 8 }, () =>
      a.mutateEconomy('Test', (r) => a.creditBananas(r, 'one-credit', 50, 'Test')),
    ),
  )
  assert.equal((await a.readEconomy('Test')).balance, first.balance + 50)
  assert.equal(
    (await a.readEconomy('Test')).history.filter((item) => item.id === 'one-credit').length,
    1,
  )
  commits = 0
  await a.mutateEconomy('Test', () => {}, { skipUnchanged: true, before: Date.now() + 60000 })
  assert.equal(commits, 1, 'deadline-bound actions must retain CAS even when unchanged')
})

test('daily immutable reads deduplicate, isolate objects, retry errors and switch keys', async () => {
  const h = setup(true, ['server/utils/immutable-read.ts']),
    read = h.api.createImmutableRead()
  let calls = 0
  const load = async () => {
    calls++
    return { answer: { id: 'rome' } }
  }
  const values = await Promise.all(Array.from({ length: 10 }, () => read('day1', load)))
  assert.equal(calls, 1)
  values[0].answer.id = 'changed'
  assert.equal((await read('day1', load)).answer.id, 'rome')
  await read('day2', load)
  assert.equal(calls, 2)
  await assert.rejects(
    read('day3', async () => {
      throw Error('offline')
    }),
  )
  await read('day3', load)
  assert.equal(calls, 3)
})

test('daily values use no Redis commands after resolution but read the new day', async () => {
  const h = setup(true, ['server/utils/wordle-draw.ts']),
    a = h.api,
    original = a.redis
  let commands = 0
  a.redis = async (list) => {
    commands += list.length
    return original(list)
  }
  const day = '2026-11-20'
  const result = await Promise.all([
    a.dailyWheelJackpot(day),
    a.dailyChallenge(day),
    a.dailyWordleAnswer(day),
  ])
  assert.ok(commands > 0)
  commands = 0
  const again = await Promise.all([
    a.dailyWheelJackpot(day),
    a.dailyChallenge(day),
    a.dailyWordleAnswer(day),
  ])
  assert.equal(JSON.stringify(again), JSON.stringify(result))
  assert.equal(commands, 0)
  await a.dailyWheelJackpot('2026-11-21')
  assert.ok(commands > 0)
})

test('unchanged crossword and parcel polling avoid writes; changes still commit', async () => {
  const h = setup(true, ['server/utils/crossword.ts', 'server/utils/parcel-game.ts'])
  const a = h.api
  let commits = 0
  const original = a.redisEval
  a.redisEval = async (...args) => {
    commits++
    return original(...args)
  }
  await a.mutateCrossword(() => {})
  await a.mutateParcels(2026, [], () => {})
  commits = 0
  await a.mutateCrossword(() => {})
  await a.mutateParcels(2026, [], () => {})
  assert.equal(commits, 0)
  await a.mutateCrossword((state) => {
    state.opensAt = '2026-12-01T10:00:00Z'
  })
  await a.mutateParcels(2026, [], (state) => {
    state.ended = true
  })
  assert.equal(commits, 2)
  assert.equal((await a.readCrossword()).opensAt, '2026-12-01T10:00:00Z')
})
