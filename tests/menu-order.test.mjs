import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { ref, computed } from 'vue'

function load(file) {
  const exports = {}
  vm.runInNewContext(
    ts.transpileModule(readFileSync(file, 'utf8'), {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    }).outputText,
    { exports },
  )
  return exports
}
const { sortGameMenu, gameMenuPriority } = load('app/utils/gameMenuOrder.ts')
const { compareAdminUsers } = load('shared/utils/admin-user-order.ts')
const now = Date.parse('2026-11-25T12:00:00Z')
const date = (hours) => new Date(now + hours * 3600_000).toISOString()

test('games follow the requested five groups, with the nearest upcoming opening first', () => {
  const cards = [
    { id: 'closed', state: { open: false } },
    { id: 'finished', state: { open: true, winner: { name: 'Anna' }, completed: true } },
    { id: 'unfinished', state: { open: true, winner: { name: 'Anna' }, completed: false } },
    { id: 'upcoming-later', state: { open: false, opensAt: date(47) } },
    { id: 'live', state: { open: true, winner: null } },
    { id: 'upcoming-soon', state: { open: false, opensAt: date(1) } },
  ]
  const before = JSON.stringify(cards)
  assert.deepEqual(
    Array.from(sortGameMenu(cards, now), (c) => c.id),
    ['live', 'upcoming-soon', 'upcoming-later', 'unfinished', 'finished', 'closed'],
  )
  assert.equal(JSON.stringify(cards), before, 'sorting must not mutate shared game state')
})

test('the 48-hour boundary is strict and equal priorities preserve their original order', () => {
  assert.equal(gameMenuPriority({ open: false, opensAt: date(48) }, now), 4)
  assert.equal(gameMenuPriority({ open: false, opensAt: date(48) }, now + 1), 1)
  assert.equal(gameMenuPriority({ open: false, opensAt: date(0) }, now), 4)
  assert.equal(gameMenuPriority({ open: false, opensAt: 'invalid' }, now), 4)
  assert.equal(gameMenuPriority(null, now), 4)
  const cards = [
    { id: 'a', state: { open: true } },
    { id: 'b', state: { open: true } },
  ]
  assert.deepEqual(
    Array.from(sortGameMenu(cards, now), (c) => c.id),
    ['a', 'b'],
  )
})

test('the actual completion and winner values move a card into the correct group', () => {
  const game = { state: { open: true, winner: null, completed: false } }
  assert.equal(gameMenuPriority(game.state, now), 0)
  game.state.winner = { name: 'Anna' }
  assert.equal(gameMenuPriority(game.state, now), 2)
  game.state.completed = true
  assert.equal(gameMenuPriority(game.state, now), 3)
})

test('admin users move immediately between active and inactive alphabetical groups', () => {
  const users = ref([
    { name: 'Anna', deactivatedAt: '2026-11-25' },
    { name: 'Norsk' },
    { name: 'Emil' },
    { name: 'Bo', deactivatedAt: '2026-11-25' },
  ])
  const ordered = computed(() => [...users.value].sort(compareAdminUsers))
  assert.deepEqual(
    ordered.value.map((u) => u.name),
    ['Emil', 'Norsk', 'Anna', 'Bo'],
  )
  delete users.value[0].deactivatedAt
  assert.deepEqual(
    ordered.value.map((u) => u.name),
    ['Anna', 'Emil', 'Norsk', 'Bo'],
  )
  users.value[2].deactivatedAt = '2026-11-25'
  assert.deepEqual(
    ordered.value.map((u) => u.name),
    ['Anna', 'Norsk', 'Bo', 'Emil'],
  )
})
