import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'

const validation = {}
vm.runInNewContext(
  ts.transpileModule(readFileSync('shared/utils/validation.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText,
  { exports: validation },
)
const source = readFileSync(new URL('../server/utils/users.ts', import.meta.url), 'utf8')
const script = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText

// Kør de rigtige brugerfunktioner mod både lokal storage og Redis-kommandoer i hukommelsen.
function setup(redisEnabled) {
  const hashes = new Map()
  const strings = new Map()
  const storage = new Map()
  const context = vm.createContext({
    exports: {},
    require: (id) =>
      id.includes('shared/utils/validation') ? validation : createRequire(import.meta.url)(id),
    redisEnabled,
    structuredClone,
    redisEval: async (_script, keys, [key, expected, next, removed, added]) => {
      let users = hashes.get(keys[0])
      if (!users) hashes.set(keys[0], (users = new Map()))
      if ((users.get(key) ?? '') !== expected) return 0
      if (next) users.set(key, next)
      else users.delete(key)
      let tokens = hashes.get(keys[1])
      if (!tokens) hashes.set(keys[1], (tokens = new Map()))
      for (const hash of JSON.parse(removed)) tokens.delete(hash)
      for (const hash of JSON.parse(added)) tokens.set(hash, key)
      return 1
    },
    createError: (value) => Object.assign(new Error(value.statusMessage), value),
    useStorage: () => ({
      getItem: async (key) => structuredClone(storage.get(key)),
      setItem: async (key, value) => storage.set(key, structuredClone(value)),
    }),
    redis: async (cmds) =>
      cmds.map(([cmd, key, ...args]) => {
        let hash = hashes.get(key)
        switch (cmd) {
          case 'HGET':
            return hash?.get(args[0]) ?? null
          case 'HGETALL':
            return [...(hash?.entries() ?? [])].flat()
          case 'HSETNX':
            if (hash?.has(args[0])) return 0
          // falls through
          case 'HSET':
            if (!hash) hashes.set(key, (hash = new Map()))
            hash.set(args[0], args[1])
            return 1
          case 'HDEL':
            return args.reduce((n, field) => n + Number(hash?.delete(field) ?? false), 0)
          case 'SET':
            if (args.includes('NX') && strings.has(key)) return null
            strings.set(key, args[0])
            return 'OK'
          case 'GET':
            return strings.get(key) ?? null
          case 'GETDEL': {
            const value = strings.get(key) ?? null
            strings.delete(key)
            return value
          }
          case 'INCR': {
            const value = Number(strings.get(key) ?? 0) + 1
            strings.set(key, String(value))
            return value
          }
          case 'EXPIRE':
            return 1
          default:
            throw new Error(`Uventet Redis-kommando: ${cmd}`)
        }
      }),
  })
  vm.runInContext(script, context)
  return context.exports
}

for (const mode of [false, true]) {
  const label = mode ? 'Redis' : 'lokal storage'
  test(`${label}: sidste logud bevarer konto, profilbillede, badges og reserveret navn`, async () => {
    const u = setup(mode)
    const token = await u.claimName('Nicole')
    const found = await u.userForToken(token)
    await u.updateUser(found.key, (user) => {
      user.avatar = '/api/media/profil.webp'
      user.badgeKeys = ['original', 'stickers:1']
      user.seenKeys = ['original', 'level:2']
      user.notify = { likes: false }
      user.notifiedAt = { original: '2026-10-29T08:00:00Z' }
      user.level = 2
      user.devices[found.hash].lastSeen = '2026-10-29T12:00:00Z'
    })
    const before = (await u.findUser('Nicole')).user
    await u.removeDevice(found.key, found.hash)
    const after = (await u.findUser('Nicole')).user
    assert.equal(Object.keys(after.devices).length, 0)
    for (const field of [
      'name',
      'createdAt',
      'avatar',
      'badgeKeys',
      'seenKeys',
      'notify',
      'notifiedAt',
      'level',
    ]) {
      assert.equal(JSON.stringify(after[field]), JSON.stringify(before[field]), field)
    }
    assert.ok(after.lastSeen)
    assert.equal(await u.userForToken(token), undefined)
    assert.equal(await u.claimName('nicole'), undefined)
    assert.equal((await u.listUsers()).length, 1)
  })

  test(`${label}: konto uden enheder kan gendannes med engangskode uden datatab`, async () => {
    const u = setup(mode)
    const oldToken = await u.claimName('Mathias')
    const found = await u.userForToken(oldToken)
    await u.updateUser(found.key, (user) => {
      user.avatar = '/api/media/mathias.webp'
      user.seenKeys = ['home']
    })
    await u.removeDevice(found.key, found.hash)
    const pair = await u.createPairCode(found.key)
    const restored = await u.redeemPairCode(pair.code, 'test-ip')
    assert.equal(restored.name, 'Mathias')
    assert.notEqual(restored.token, oldToken)
    const me = await u.userForToken(restored.token)
    assert.equal(me.user.avatar, '/api/media/mathias.webp')
    assert.equal(me.user.seenKeys[0], 'home')
    assert.equal(me.user.createdAt, found.user.createdAt)
    assert.equal(await u.redeemPairCode(pair.code, 'test-ip'), undefined)
    assert.equal(await u.userForToken(oldToken), undefined)
  })

  test(`${label}: logud fra én enhed bevarer adgang fra den anden`, async () => {
    const u = setup(mode)
    const token = await u.claimName('Norsk')
    const first = await u.userForToken(token)
    const code = await u.createPairCode(first.key)
    const second = await u.redeemPairCode(code.code, 'test-ip')
    await u.removeDevice(first.key, first.hash)
    assert.equal(await u.userForToken(token), undefined)
    assert.equal((await u.userForToken(second.token)).user.name, 'Norsk')
    assert.equal(Object.keys((await u.findUser('Norsk')).user.devices).length, 1)
  })
}

for (const remote of [false, true])
  test(`concurrent profile updates preserve fields, devices and deletion (${remote ? 'Redis' : 'local'})`, async () => {
    const u = setup(remote)
    const token = await u.claimName('Concurrent')
    const found = await u.userForToken(token)
    await Promise.all([
      u.updateUser(found.key, (r) => {
        r.notify = { likes: false }
      }),
      u.updateUser(found.key, (r) => {
        r.seenKeys = ['one']
      }),
    ])
    let current = (await u.findUser('Concurrent')).user
    assert.equal(current.notify.likes, false)
    assert.deepEqual(Array.from(current.seenKeys), ['one'])
    await Promise.all([
      u.setAvatar(found.key, found.user, '/api/media/new.webp'),
      u.updateUser(found.key, (r) => {
        r.seenKeys.push('two')
      }),
    ])
    current = (await u.findUser('Concurrent')).user
    assert.equal(current.avatar, '/api/media/new.webp')
    assert.equal(current.seenKeys.length, 2)
    const codes = await Promise.all([u.createPairCode(found.key), u.createPairCode(found.key)])
    const devices = await Promise.all(codes.map(({ code }, i) => u.redeemPairCode(code, 'ip-' + i)))
    assert.ok(devices.every(Boolean))
    assert.equal(Object.keys((await u.findUser('Concurrent')).user.devices).length, 3)
    await Promise.all([
      u.deleteUser(found.key),
      u.updateUser(found.key, (r) => {
        r.level = 8
      }),
    ])
    assert.equal(await u.findUser('Concurrent'), undefined)
    assert.equal(await u.userForToken(token), undefined)
  })
