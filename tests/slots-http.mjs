// Isolated HTTP smoke after build. Temporary storage, no real accounts or Redis.
import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { resolve, sep } from 'node:path'
import assert from 'node:assert/strict'
await mkdir(resolve('.data'), { recursive: true })
const folder = await mkdtemp(resolve('.data/slots-smoke-'))
const env = {
  ...process.env,
  PORT: '3098',
  HOST: '127.0.0.1',
  NITRO_HOST: '127.0.0.1',
  KV_REST_API_URL: '',
  KV_REST_API_TOKEN: '',
  UPSTASH_REDIS_REST_URL: '',
  UPSTASH_REDIS_REST_TOKEN: '',
  VERCEL_ENV: '',
  ADMIN_PASSWORD: '',
  NUXT_PUBLIC_BANANDITTEN_ENABLED: 'true',
  NUXT_PUBLIC_BANANJACK_ENABLED: 'false',
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
const base = 'http://127.0.0.1:3098'
async function request(path, { token, body } = {}) {
  const r = await fetch(base + path, {
    method: body ? 'POST' : 'GET',
    headers: {
      ...(token ? { 'x-user-token': token } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(30000),
  })
  return { status: r.status, data: await r.json() }
}
try {
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(base + '/api/version')).ok) break
    } catch {}
    if (child.exitCode !== null) throw Error(output)
    await new Promise((r) => setTimeout(r, 100))
  }
  assert.equal((await request('/api/games/slots')).status, 401)
  assert.equal((await request('/api/games/bananjack')).status, 403)
  const login = await request('/api/me', { body: { name: 'Automattest' } })
  assert.equal(login.status, 200)
  const token = login.data.token
  const initial = await request('/api/games/slots', { token })
  assert.equal(initial.data.balance, 250)
  assert.equal(initial.data.dailyLimit.remaining, 300)
  assert.equal((await request('/api/games/slots', { token, body: { id: 'bad' } })).status, 400)
  const body = {
    id: 'http-slots-round-one',
    previous: null,
    sequence: 1,
    bet: 10,
    payout: 99999999,
    multiplier: 9999,
  }
  const replies = await Promise.all(
    Array.from({ length: 6 }, () => request('/api/games/slots', { token, body })),
  )
  assert.ok(replies.every((r) => r.status === 200))
  const spin = replies[0].data.spin
  assert.ok([0, 1, 2, 5, 10, 25, 100].includes(spin.multiplier))
  assert.equal(spin.payout, spin.multiplier * 10)
  for (const reply of replies) assert.deepEqual(reply.data.spin, spin)
  const restored = await request('/api/games/slots', { token })
  assert.deepEqual(restored.data.spin, spin)
  assert.equal(restored.data.dailyLimit.netLoss, 10 - spin.payout)
  const wallet = (await request('/api/economy/me', { token })).data
  assert.equal(wallet.history.filter((t) => t.id === 'slots:1:bet').length, 1)
  assert.equal(wallet.history.filter((t) => t.id === 'badge:slot-spins:1').length, 1)
  assert.equal(
    wallet.history.reduce((sum, t) => sum + t.amount, 0),
    wallet.wallet.balance,
  )
  assert.equal(wallet.wallet.slots.spins, 1)
  assert.equal(
    (await request('/api/games/slots', { token, body: { ...body, id: 'http-slots-stale-id' } }))
      .status,
    409,
  )
  assert.equal(
    (
      await request('/api/games/slots', {
        token,
        body: { ...body, id: 'http-slots-next-two', previous: spin.id, sequence: 2, bet: 1000 },
      })
    ).status,
    400,
  )
  const publicWallet = (await request('/api/economy/public')).data.automattest
  assert.equal(publicWallet.slots.spins, 1)
  assert.equal(publicWallet.slotGame, undefined)
  assert.equal(publicWallet.history, undefined)
  console.log(
    'Slots HTTP passed: auth, forged payout ignored, six retries one debit, saved result, badge paid once, shared allowance, stale requests and public DTO; Bananjack remains disabled.',
  )
} catch (error) {
  console.error(output.slice(-3000))
  throw error
} finally {
  child.kill()
  await new Promise((r) => child.once('close', r))
  assert.ok(folder.startsWith(resolve('.data') + sep), 'Unsafe cleanup path')
  await rm(folder, { recursive: true, force: true })
}
