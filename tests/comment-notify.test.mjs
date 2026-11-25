import assert from 'node:assert/strict'
import test from 'node:test'
import vm from 'node:vm'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

const current = {
  id: 'new',
  stickerId: 'sticker',
  author: 'Mathias',
  mentions: [],
  text: 'Flot sticker!',
  createdAt: '2026-11-25T12:00:00.000Z',
}
const sticker = { id: 'sticker', title: 'Emil i Aalborg', placedBy: ['Emil'] }
const previous = (author, overrides = {}) => ({
  ...current,
  id: `old-${author}`,
  author,
  createdAt: '2026-11-24T12:00:00.000Z',
  ...overrides,
})
function harness(comments = [], users = {}) {
  const sent = [],
    saved = [],
    reads = []
  const exports = {}
  vm.runInNewContext(
    ts.transpileModule(readFileSync('server/utils/comment-notify.ts', 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    {
      exports,
      nameKey: (n) => n.toLowerCase(),
      snippet: (s) => s,
      listComments: async (id) => {
        reads.push(id)
        return comments
      },
      findUser: async (name) =>
        users[name.toLowerCase()] === null
          ? undefined
          : {
              key: name.toLowerCase(),
              user: users[name.toLowerCase()] ?? {},
            },
      wants: (prefs, type) => prefs?.[type] !== false,
      saveActivity: async (...args) => saved.push(args),
      notifyUser: async (...args) => sent.push(args),
    },
  )
  return { ...exports, sent, saved, reads }
}

test('new comments notify all sticker owners and previous commenters once, excluding the author and later comments', async () => {
  const h = harness([
    previous('Nicole'),
    previous('NICOLE'),
    previous('Emil'),
    previous('Mathias'),
    previous('Morten', { createdAt: '2026-11-25T13:00:00.000Z' }),
    current,
  ])
  await h.notifyComment(current, { ...sticker, placedBy: ['Emil', 'Anna'] })
  assert.deepEqual(h.sent.map(([name]) => name).sort(), ['Anna', 'Emil', 'Nicole'])
  assert.equal(h.saved.length, 3)
  assert.deepEqual(h.reads, ['sticker'])
  for (const [, message, type, activity] of h.sent) {
    assert.equal(message.url, '/sticker/sticker?comment=new')
    assert.equal(message.tag, 'comment-new')
    assert.equal(type, 'comments')
    assert.equal(activity, false)
  }
})

test('mentions and direct replies take priority over participant and owner notifications', async () => {
  const h = harness([previous('Nicole'), previous('Emil')])
  await h.notifyComment({ ...current, mentions: ['Nicole'] }, sticker, { author: 'Nicole' })
  assert.equal(h.sent.filter(([name]) => name === 'Nicole').length, 1)
  assert.equal(h.sent.find(([name]) => name === 'Nicole')[2], 'tags')
  assert.equal(h.saved.filter(([name]) => name === 'nicole').length, 1)
})

test('muted mentions and replies fall back to comments for a previous commenter', async () => {
  const h = harness([previous('Nicole')], { nicole: { notify: { tags: false, replies: false } } })
  await h.notifyComment({ ...current, mentions: ['Nicole'] }, sticker, { author: 'Nicole' })
  assert.equal(h.sent.find(([name]) => name === 'Nicole')[2], 'comments')
  assert.equal(h.saved.filter(([name]) => name === 'nicole').length, 1)
})

test('muted participants retain in-app activity, deactivated and unregistered participants receive nothing', async () => {
  const h = harness([previous('Nicole'), previous('Morten'), previous('Anna')], {
    nicole: { notify: { comments: false } },
    morten: { deactivatedAt: '2026-11-20' },
    anna: null,
  })
  await h.notifyComment(current, sticker)
  assert.deepEqual(
    h.sent.map(([name]) => name),
    ['Emil'],
  )
  assert.deepEqual(h.saved.map(([key]) => key).sort(), ['emil', 'nicole'])
})

test('editing mentions does not replay owner or participant notifications or read the discussion', async () => {
  const h = harness([previous('Morten')])
  await h.notifyComment({ ...current, mentions: ['Nicole'] }, sticker, undefined, ['Nicole'])
  assert.deepEqual(
    h.sent.map(([name]) => name),
    ['Nicole'],
  )
  assert.equal(h.reads.length, 0)
  await h.notifyComment(current, sticker, undefined, [])
  assert.equal(h.sent.length, 1)
  assert.equal(h.reads.length, 0)
})

test('an owner commenting on their own sticker never receives their own push', async () => {
  const h = harness([previous('Mathias')])
  await h.notifyComment(current, { ...sticker, placedBy: ['Mathias'] })
  assert.equal(h.sent.length, 0)
  assert.equal(h.saved.length, 0)
})
