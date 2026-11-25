import assert from 'node:assert/strict'
import test from 'node:test'
import vm from 'node:vm'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { setup } from './helpers/economy-harness.mjs'

const compile = (file) =>
  ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText
function route() {
  const calls = [],
    exports = {}
  vm.runInNewContext(compile('server/api/admin/users/[name]/status.put.ts'), {
    exports,
    defineEventHandler: (fn) => fn,
    requireAdmin: (e) => {
      if (!e.admin) throw Object.assign(Error('Admin required'), { statusCode: 401 })
    },
    setHeader: () => {},
    readBody: async (e) => {
      calls.push('read')
      return e.body
    },
    getRouterParam: (e) => e.name,
    findUser: async (name) =>
      name === 'missing' ? undefined : { key: 'nicole', user: { name: 'Nicole' } },
    setUserActive: async (key, active) => {
      calls.push({ key, active })
      return {
        name: 'Nicole',
        devices: { private: true },
        deactivatedAt: active ? undefined : '2026-11-25T12:00:00Z',
      }
    },
    createError: (e) => Object.assign(Error(e.statusMessage), e),
  })
  return { call: exports.default, calls }
}

test('user status requires admin and a strict boolean before any write', async () => {
  const h = route()
  await assert.rejects(h.call({ body: { active: false } }), { statusCode: 401 })
  assert.equal(h.calls.length, 0)
  for (const body of [null, {}, { active: 'false' }, { active: 1 }])
    await assert.rejects(h.call({ admin: true, body }), { statusCode: 400 })
  assert.ok(h.calls.every((c) => c === 'read'))
  await assert.rejects(h.call({ admin: true, name: 'missing', body: { active: false } }), {
    statusCode: 404,
  })
})

test('deactivation and reactivation write only status and never expose device data', async () => {
  const h = route()
  const off = await h.call({ admin: true, name: 'Nicole', body: { active: false } })
  assert.equal(off.deactivatedAt, '2026-11-25T12:00:00Z')
  assert.equal(off.devices, undefined)
  const on = await h.call({ admin: true, name: 'Nicole', body: { active: true } })
  assert.equal(on.deactivatedAt, null)
  assert.equal(h.calls.filter((c) => typeof c === 'object').length, 2)
})

test('inactive sticker names cannot reappear on any metric or registered-only leaderboard', () => {
  const exports = {}
  vm.runInNewContext(compile('shared/utils/leaderboard-people.ts'), { exports })
  const people = [{ name: 'NICOLE' }, { name: 'Emil' }, { name: 'Morten' }]
  const users = [{ name: 'Nicole', inactive: true }, { name: 'Emil' }]
  const rows = exports.leaderboardPeople(people, users)
  assert.deepEqual(
    Array.from(rows, (r) => r.name),
    ['Emil', 'Morten'],
  )
  assert.deepEqual(
    Array.from(
      rows.filter((r) => r.registered),
      (r) => r.name,
    ),
    ['Emil'],
  )
  users[0].inactive = false
  assert.ok(exports.leaderboardPeople(people, users).some((r) => r.name === 'Nicole'))
})

test('crossword rankings hide inactive registered users without deleting their saved progress', () => {
  const { api: a } = setup(false, ['server/utils/crossword.ts'])
  const now = new Date('2027-01-04T12:00:00Z')
  const state = { ...a.freshCrossword('2'), opensAt: '2027-01-04T11:00:00Z' }
  const [cell, value] = Object.entries(a.crosswordSolution('2'))[0]
  a.crosswordHelp(state, 'u:nicole', { [cell]: value }, now)
  a.crosswordHelp(state, 'd:guest', { [cell]: value }, now)
  const users = [{ name: 'Nicole', deactivatedAt: now.toISOString() }]
  const hidden = a.crosswordLeaderboard(state, users, now)
  assert.equal(hidden.players.length, 1)
  assert.equal(hidden.players[0].name, null)
  assert.equal(state.progress['u:nicole'].letters[cell], value)
  delete users[0].deactivatedAt
  assert.ok(a.crosswordLeaderboard(state, users, now).players.some((p) => p.name === 'Nicole'))
})

test('all wallet-backed games reject an inactive account even with a valid device token', async () => {
  const exports = {}
  let user = { name: 'Nicole', deactivatedAt: '2026-11-25T12:00:00Z' }
  vm.runInNewContext(compile('server/utils/economy-auth.ts'), {
    exports,
    setHeader: () => {},
    readToken: () => 'valid-token',
    userForToken: async () => ({ user }),
    createError: (e) => Object.assign(Error(e.statusMessage), e),
  })
  await assert.rejects(exports.economyUser({}), { statusCode: 403 })
  user = { name: 'Nicole' }
  assert.equal((await exports.economyUser({})).user.name, 'Nicole')
})

test('calendar draw excludes inactive users from every personal plan and physical prize', () => {
  const { api: a } = setup(false, ['server/utils/advent.ts', 'server/utils/advent-draw.ts'])
  const users = ['Anna', 'Emil', 'Nicole', 'Norsk', 'Ida', 'Marc', 'Morten'].map((name) => ({
    name,
    createdAt: '2026-11-01T12:00:00Z',
    ...(name === 'Anna' ? { deactivatedAt: '2026-11-25T12:00:00Z' } : {}),
  }))
  const draw = a.createAdventDraw(users, 'inactive-calendar', new Date('2026-12-01T12:00:00Z'))
  assert.ok(!draw.participants.includes('Anna'))
  assert.equal(draw.plans.anna, undefined)
  assert.ok(draw.awards.every((award) => award.winner !== 'Anna'))
})

test('inactive parcel entrants are removed before start and their unused gifts do not inflate the pool', async () => {
  const { api: a } = setup(false, ['shared/utils/parcel-game.ts', 'server/utils/parcel-game.ts'])
  const { game } = await a.mutateParcels(
    2026,
    ['Anna', 'Emil', 'Norsk', 'Nicole', 'Ida', 'Marc', 'Morten'],
    () => {},
  )
  const secretEnd = game.endsAt
  a.excludeDeactivatedParcelPlayers(game, ['ANNA'], new Date('2026-11-25T12:00:00Z'))
  assert.equal(game.players.length, 6)
  assert.equal(game.parcels.length, 18)
  assert.ok(!game.players.includes('Anna'))
  assert.equal(game.endsAt, secretEnd)
})

test('deactivation during parcel play returns unopened gifts without rerolling contents or erasing old prizes', () => {
  const { api: a } = setup(false, ['shared/utils/parcel-game.ts', 'server/utils/parcel-game.ts'])
  const board = {
    players: ['Anna', 'Emil'],
    startsAt: '2026-11-27T03:00:00Z',
    ended: false,
    prizesAssigned: true,
    pending: { 'u:Anna': { id: 'pick' } },
    parcels: [
      { id: 'p1', owner: 'Anna', amount: 50, reward: { kind: 'mix-max', amount: 50 } },
      { id: 'p2', owner: 'Anna', amount: 500, openedAt: '2026-12-27T12:00:00Z' },
    ],
  }
  const reward = JSON.stringify(board.parcels[0].reward)
  a.excludeDeactivatedParcelPlayers(board, ['Anna'], new Date('2026-12-28T12:00:00Z'))
  assert.equal(board.parcels[0].owner, null)
  assert.equal(JSON.stringify(board.parcels[0].reward), reward)
  assert.equal(board.parcels[1].owner, 'Anna')
  assert.equal(board.pending['u:Anna'], undefined)
})
