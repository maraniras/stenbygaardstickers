// Run after `nuxt build`: isolated production server + temporary filesystem storage.
// Never connects to Redis or changes real accounts/daily attempts.
import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { resolve } from 'node:path'
import assert from 'node:assert/strict'

await mkdir(resolve('.data'), { recursive: true })
const folder = await mkdtemp(resolve('.data/economy-smoke-'))
const env = {
  ...process.env,
  PORT: '3097',
  HOST: '127.0.0.1',
  NITRO_HOST: '127.0.0.1',
  KV_REST_API_URL: '',
  KV_REST_API_TOKEN: '',
  UPSTASH_REDIS_REST_URL: '',
  UPSTASH_REDIS_REST_TOKEN: '',
  VERCEL_ENV: '',
  ADMIN_PASSWORD: '',
}
const child = spawn(process.execPath, [resolve('.output/server/index.mjs')], {
  cwd: folder,
  env,
  stdio: ['ignore', 'pipe', 'pipe'],
  windowsHide: true,
})
let output = ''
child.stdout.on('data', (d) => (output += d))
child.stderr.on('data', (d) => (output += d))
const base = 'http://127.0.0.1:3097'
async function request(path, { token, body, method = body ? 'POST' : 'GET' } = {}) {
  const response = await fetch(base + path, {
    method,
    headers: {
      ...(token ? { 'x-user-token': token } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(30000),
  })
  const data = await response.json()
  return { status: response.status, data }
}
try {
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(base + '/api/version')).ok) break
    } catch {}
    if (child.exitCode !== null) throw Error(output)
    await new Promise((r) => setTimeout(r, 100))
  }
  assert.equal((await request('/api/economy/me')).status, 401)
  const login = await request('/api/me', { body: { name: 'Spiltest' } })
  assert.equal(login.status, 200)
  const token = login.data.token
  let { data: state } = await request('/api/economy/me', { token })
  assert.equal(state.wallet.balance, 250)
  assert.equal(state.city.options.length, 6)
  assert.equal(state.city.answer, undefined)
  const day = state.day
  assert.ok(
    [400, 450, 500, 550, 600, 650, 700, 750, 800, 850, 900, 1000].includes(state.wheelJackpot),
  )
  const other = await request('/api/me', { body: { name: 'SpiltestTo' } })
  assert.equal(
    (await request('/api/economy/me', { token: other.data.token })).data.wheelJackpot,
    state.wheelJackpot,
  )
  assert.equal(
    (await request('/api/games/city/guess', { token, body: { day, choice: 'forged' } })).status,
    400,
  )
  assert.equal(
    (await request('/api/games/wheel', { token, body: { day: '1900-01-01' } })).status,
    409,
  )
  const spins = await Promise.all(
    Array.from({ length: 6 }, () =>
      request('/api/games/wheel', { token, body: { day, jackpot: 1000000 } }),
    ),
  )
  assert.ok(spins.every((r) => r.status === 200))
  assert.equal(new Set(spins.map((r) => r.data.wheel.prize)).size, 1)
  assert.ok(spins.every((r) => r.data.wheel.jackpotAmount === state.wheelJackpot))
  state = (await request('/api/economy/me', { token })).data
  assert.equal(state.wallet.stats.wheelSpins, 1)
  const second = await request('/api/me/code', { token, body: {} })
  const pair = await request('/api/me/pair', { body: { code: second.data.code } })
  assert.equal(pair.status, 200)
  const paired = (await request('/api/economy/me', { token: pair.data.token })).data
  assert.equal(paired.wallet.balance, state.wallet.balance)
  assert.deepEqual(paired.wheel, state.wheel)
  const image = await fetch(base + `/api/games/city/image?day=${day}`, {
    headers: { 'x-user-token': token },
    signal: AbortSignal.timeout(40000),
  })
  assert.equal(image.status, 200)
  assert.match(image.headers.get('content-type'), /image\/jpeg/)
  assert.ok((await image.arrayBuffer()).byteLength > 1000)
  const first = state.city.options[0].id
  const guesses = await Promise.all(
    Array.from({ length: 5 }, () =>
      request('/api/games/city/guess', { token, body: { day, choice: first } }),
    ),
  )
  assert.ok(guesses.every((r) => r.status === 200))
  state = (await request('/api/economy/me', { token })).data
  assert.equal(state.city.guesses.length, 1)
  for (const option of state.city.options.slice(1, 5))
    if (!state.city.finished)
      state = (await request('/api/games/city/guess', { token, body: { day, choice: option.id } }))
        .data
  assert.equal(state.city.finished, true)
  assert.ok(state.city.answer)
  assert.ok(state.city.guesses.length <= 5)
  const balance = state.wallet.balance
  state = (await request('/api/games/city/guess', { token, body: { day, choice: first } })).data
  assert.equal(state.wallet.balance, balance)
  const publicData = (await request('/api/economy/public')).data.spiltest
  assert.equal(publicData.balance, balance)
  assert.equal(publicData.history, undefined)
  assert.equal(publicData.days, undefined)
  assert.equal(publicData.claims, undefined)
  await request('/api/me', { token, method: 'DELETE' })
  assert.equal(
    (await request('/api/economy/me', { token: pair.data.token })).data.wallet.balance,
    balance,
  )
  console.log(
    'HTTP smoke passed: auth, isolated welcome credit, two devices, parallel requests, image proxy, 5-guess limit, idempotent payouts and public/private data.',
  )
} catch (error) {
  console.error(output.slice(-3000))
  throw error
} finally {
  child.kill()
  await new Promise((r) => child.once('close', r))
  await rm(folder, { recursive: true, force: true })
}
