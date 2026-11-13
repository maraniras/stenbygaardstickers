import assert from 'node:assert/strict'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'
import sharp from 'sharp'
import { readFileSync } from 'node:fs'

const day = '2026-11-13'
const jpeg = await sharp({
  create: { width: 700, height: 490, channels: 3, background: '#52735c' },
})
  .jpeg()
  .toBuffer()
function imageRoute({
  readFails = false,
  writeFails = false,
  cached = null,
  upstreamFails = false,
  primaryFails = false,
  primaryInvalid = false,
  tilesSucceed = false,
  loggedIn = true,
  queryDay = day,
  guesses = [],
} = {}) {
  const headers = {},
    logs = [],
    calls = { upstream: 0, tiles: 0, cacheWrite: 0, challenge: 0, requests: [] }
  const run = { guesses: [...guesses] }
  const context = vm.createContext({
    exports: {},
    Buffer,
    URLSearchParams,
    Math,
    require: () => sharp,
    console: { warn: (...args) => logs.push(args) },
    defineEventHandler: (fn) => fn,
    economyUser: async () => {
      if (!loggedIn) throw Object.assign(Error('Login required'), { statusCode: 401 })
      return { user: { name: 'Fixture' } }
    },
    gameDay: () => day,
    getQuery: () => ({ day: queryDay, revision: 99 }),
    readEconomy: async () => ({ days: { [day]: { city: run } } }),
    useStorage: () => ({
      getItem: async () => {
        if (readFails) throw Error('cache unavailable')
        return cached
      },
      setItem: async () => {
        calls.cacheWrite++
        if (writeFails) throw Error('cache unavailable')
      },
    }),
    dailyChallenge: async () => {
      calls.challenge++
      return { answer: { lat: 57, lng: 9.9 } }
    },
    cityAerialTiles: async () => {
      calls.tiles++
      if (!tilesSucceed) throw Error('tile service unavailable')
      return jpeg
    },
    setHeader: (_event, key, value) => {
      headers[key] = value
    },
    $fetch: async (url, options) => {
      calls.upstream++
      calls.requests.push({ url, options })
      if (upstreamFails) throw Object.assign(Error('upstream failed'), { statusCode: 503 })
      if (calls.upstream === 1 && primaryFails) throw Error('primary unavailable')
      if (calls.upstream === 1 && primaryInvalid) return Buffer.from('{"error":"unavailable"}')
      return jpeg
    },
    createError: (data) => Object.assign(Error(data.statusMessage), data),
  })
  const source = ts.transpileModule(readFileSync('server/api/games/city/image.get.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText
  vm.runInContext(source, context)
  return { get: () => context.exports.default({}), headers, logs, calls, run }
}

for (const mode of ['read', 'write'])
  test(`city image remains available when its optional cache ${mode} fails`, async () => {
    const route = imageRoute({
      readFails: mode === 'read',
      writeFails: mode === 'write',
      guesses: ['wrong-city'],
    })
    const image = await route.get()
    const meta = await sharp(image).metadata()
    assert.equal(meta.format, 'jpeg')
    assert.equal(meta.width, 700)
    assert.equal(meta.height, 490)
    assert.equal(route.headers['Content-Type'], 'image/jpeg')
    assert.equal(route.calls.upstream, 1)
    assert.deepEqual(route.run.guesses, ['wrong-city'])
    assert.ok(route.logs.length > 0)
  })

test('valid cached city images are reused; corrupt cache entries are regenerated', async () => {
  const cached = imageRoute({ cached: jpeg.toString('base64') })
  assert.deepEqual(await cached.get(), jpeg)
  assert.equal(cached.calls.upstream, 0)
  assert.equal(cached.calls.challenge, 0)
  const corrupt = imageRoute({ cached: 'not an image' })
  assert.equal((await sharp(await corrupt.get()).metadata()).format, 'jpeg')
  assert.equal(corrupt.calls.upstream, 1)
})

test('upstream failure remains uncached and does not consume a guess', async () => {
  const route = imageRoute({ upstreamFails: true })
  await assert.rejects(route.get(), (e) => e.statusCode === 502)
  assert.equal(route.headers['Cache-Control'], 'no-store')
  assert.equal(route.headers['Content-Type'], undefined)
  assert.equal(route.calls.cacheWrite, 0)
  assert.equal(route.calls.upstream, 2)
  assert.equal(route.run.guesses.length, 0)
  assert.ok(!JSON.stringify(route.logs).includes('bbox'))
})

for (const failure of ['primaryFails', 'primaryInvalid'])
  test(`city image uses the alternate Esri host when ${failure}`, async () => {
    const route = imageRoute({ [failure]: true })
    assert.equal((await sharp(await route.get()).metadata()).format, 'jpeg')
    assert.equal(route.calls.upstream, 2)
    const [first, second] = route.calls.requests
    assert.equal(new URL(first.url).host, 'server.arcgisonline.com')
    assert.equal(new URL(second.url).host, 'services.arcgisonline.com')
    assert.equal(new URL(first.url).search, new URL(second.url).search)
    assert.equal(first.options.timeout + second.options.timeout, 10_000)
    assert.equal(first.options.retry, 0)
    assert.equal(second.options.retry, 0)
    assert.equal(route.run.guesses.length, 0)
    assert.equal(route.calls.cacheWrite, 1)
  })

test('cached tiles bypass failed exports without consuming a guess', async () => {
  const route = imageRoute({ upstreamFails: true, tilesSucceed: true })
  assert.deepEqual(await route.get(), jpeg)
  assert.equal(route.calls.upstream, 2)
  assert.equal(route.calls.tiles, 1)
  assert.equal(route.calls.cacheWrite, 1)
  assert.equal(route.headers['Content-Type'], 'image/jpeg')
  assert.equal(route.run.guesses.length, 0)
})

test('city image still requires login and the current server game day', async () => {
  const anonymous = imageRoute({ loggedIn: false })
  await assert.rejects(anonymous.get(), (e) => e.statusCode === 401)
  assert.equal(anonymous.calls.upstream, 0)
  const oldDay = imageRoute({ queryDay: '2026-11-12' })
  await assert.rejects(oldDay.get(), (e) => e.statusCode === 409)
  assert.equal(oldDay.calls.upstream, 0)
})
