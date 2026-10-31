// Brugere uden oprettelse: man vælger et navn, og navnet låses til enheden med en
// hemmelig nøgle (gemt i localStorage, sendt i headeren x-user-token). Serveren
// gemmer kun en hash af nøglen. Flere enheder kobles på med en 6-cifret kode, der
// gælder i 10 minutter og kun kan bruges én gang.
//
// Redis: hash "users" (navnenøgle → UserRecord-JSON), hash "user-tokens"
// (nøglehash → navnenøgle), "user-code:<kode>" med udløb og "user-pairfail:<ip>"
// som tæller forkerte koder. Uden Redis bruges Nitros lokale storage i `.data/`.
import { createHash, randomBytes, randomInt } from 'node:crypto'
import type { PushSubscription } from 'web-push'
import { normalizeName, validName } from '../../shared/utils/validation'

interface UserDevice {
  addedAt: string
  lastSeen: string
  /** Push-abonnement til badge-notifikationer på denne enhed */
  push?: PushSubscription
}

export interface UserRecord {
  name: string
  createdAt: string
  /** Sidst set bevares også, når den sidste enhed logger ud. */
  lastSeen?: string
  /** Profilbillede (Blob-URL eller /api/media/ under dev) */
  avatar?: string
  /** Nøglehash → enhed */
  devices: Record<string, UserDevice>
  /** Badges serveren sidst har set (earnedKeys) – til at finde nye og mistede */
  badgeKeys?: string[]
  /** Badges brugeren har set – i en notifikation eller "ny badge"-pop-up'en */
  seenKeys?: string[]
  /** Nøgle → hvornår der sidst blev sendt besked, så en rekord der skifter frem og
   *  tilbage ikke giver besked hele tiden */
  notifiedAt?: Record<string, string>
  /** Hvilke typer notifikationer man vil have (shared/utils/notify.ts) */
  notify?: NotifyPrefs
  /** Level serveren sidst har set – til "Level op"-beskeden */
  level?: number
}

interface LocalUsers {
  users: Record<string, UserRecord>
  tokens: Record<string, string>
  codes: Record<string, { key: string; exp: number }>
}

const CODE_TTL = 10 * 60
const MAX_PAIR_FAILS = 10
export const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/

async function readLocal(): Promise<LocalUsers> {
  return (
    (await useStorage('data').getItem<LocalUsers>('users')) ?? { users: {}, tokens: {}, codes: {} }
  )
}

async function writeLocal(data: LocalUsers) {
  await useStorage('data').setItem('users', data)
}

export function cleanName(input: unknown) {
  const name = normalizeName(input)
  if (!validName(name))
    throw createError({
      statusCode: 400,
      statusMessage: 'Skriv et navn med bogstaver (højst 30 tegn)',
    })
  return name
}

/** Navne er ens uanset store og små bogstaver */
export const nameKey = (name: string) => name.toLocaleLowerCase('da')

export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')

export function readToken(event: Parameters<typeof getHeader>[0]) {
  const token = getHeader(event, 'x-user-token') ?? ''
  return TOKEN_RE.test(token) ? token : ''
}

/** Brugeren bag enhedens nøgle, hvis den stadig er gyldig */
export async function userForToken(token: string) {
  if (!token) return undefined
  const hash = hashToken(token)
  let key: string | undefined
  let user: UserRecord | undefined
  if (!redisEnabled) {
    const data = await readLocal()
    key = data.tokens[hash]
    user = key ? data.users[key] : undefined
  } else {
    const [k] = (await redis([['HGET', 'user-tokens', hash]])) as [string | null]
    key = k ?? undefined
    if (key) {
      const [json] = (await redis([['HGET', 'users', key]])) as [string | null]
      user = json ? JSON.parse(json) : undefined
    }
  }
  if (!key || !user?.devices[hash]) return undefined
  return { key, hash, user }
}

/** User JSON and its token index commit together. Callbacks may be retried. */
export const USER_CAS = `if (redis.call('HGET', KEYS[1], ARGV[1]) or '') ~= ARGV[2] then return 0 end
if ARGV[3] == '' then redis.call('HDEL', KEYS[1], ARGV[1]) else redis.call('HSET', KEYS[1], ARGV[1], ARGV[3]) end
for _, hash in ipairs(cjson.decode(ARGV[4])) do redis.call('HDEL', KEYS[2], hash) end
for _, hash in ipairs(cjson.decode(ARGV[5])) do redis.call('HSET', KEYS[2], hash, ARGV[1]) end
return 1`
let localTail: Promise<unknown> = Promise.resolve()
function mutateLocal<T>(change: (data: LocalUsers) => T) {
  const job = localTail.then(async () => {
    const data = await readLocal()
    const result = change(data)
    await writeLocal(data)
    return result
  })
  localTail = job.catch(() => {})
  return job
}
async function mutateUser(
  key: string,
  change: (user: UserRecord | undefined) => UserRecord | undefined,
) {
  if (!redisEnabled)
    return mutateLocal((data) => {
      const before = data.users[key]
      const oldHashes = Object.keys(before?.devices ?? {})
      const user = change(before ? structuredClone(before) : undefined)
      for (const hash of oldHashes) if (!user?.devices[hash]) delete data.tokens[hash]
      if (user) {
        data.users[key] = user
        for (const hash of Object.keys(user.devices)) data.tokens[hash] = key
      } else delete data.users[key]
      return { before, user }
    })
  for (let attempt = 0; attempt < 16; attempt++) {
    const [raw] = (await redis([['HGET', 'users', key]])) as [string | null]
    const before = raw ? (JSON.parse(raw) as UserRecord) : undefined
    const user = change(before ? structuredClone(before) : undefined)
    const removed = Object.keys(before?.devices ?? {}).filter((hash) => !user?.devices[hash])
    const added = Object.keys(user?.devices ?? {}).filter((hash) => !before?.devices[hash])
    if (
      (await redisEval(
        USER_CAS,
        ['users', 'user-tokens'],
        [
          key,
          raw ?? '',
          user ? JSON.stringify(user) : '',
          JSON.stringify(removed),
          JSON.stringify(added),
        ],
      )) === 1
    )
      return { before, user }
  }
  throw createError({
    statusCode: 409,
    statusMessage: 'Profilen blev ændret fra en anden enhed. Prøv igen.',
  })
}
export async function updateUser(key: string, change: (user: UserRecord) => void) {
  return (
    await mutateUser(key, (user) => {
      if (user) change(user)
      return user
    })
  ).user
}
export async function touchDevice(key: string, hash: string, user: UserRecord) {
  if (!user.devices[hash] || Date.now() - Date.parse(user.devices[hash]!.lastSeen) < 12 * 3600_000)
    return
  await updateUser(key, (current) => {
    if (current.devices[hash]) current.devices[hash]!.lastSeen = new Date().toISOString()
  })
}
export async function setAvatar(key: string, _user: UserRecord, avatar: string | undefined) {
  const { before, user } = await mutateUser(key, (current) => {
    if (current) {
      if (avatar) current.avatar = avatar
      else delete current.avatar
    }
    return current
  })
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Brugeren findes ikke længere' })
  return before?.avatar
}
export async function claimName(name: string) {
  const key = nameKey(name),
    token = randomBytes(32).toString('base64url'),
    hash = hashToken(token)
  const now = new Date().toISOString()
  const { before } = await mutateUser(
    key,
    (current) =>
      current ?? { name, createdAt: now, devices: { [hash]: { addedAt: now, lastSeen: now } } },
  )
  return before ? undefined : token
}
async function addDevice(key: string) {
  const token = randomBytes(32).toString('base64url'),
    hash = hashToken(token),
    now = new Date().toISOString()
  const user = await updateUser(key, (current) => {
    current.devices[hash] = { addedAt: now, lastSeen: now }
  })
  return user ? { name: user.name, token } : undefined
}

/** Brugeren med dette navn, hvis nogen har valgt det */
export async function findUser(name: string) {
  const key = nameKey(name)
  const user = await getUser(key)
  return user ? { key, user } : undefined
}

async function getUser(key: string) {
  if (!redisEnabled) return (await readLocal()).users[key]
  const [json] = (await redis([['HGET', 'users', key]])) as [string | null]
  return json ? (JSON.parse(json) as UserRecord) : undefined
}

/** Logger kun enheden ud. Kontoen og det reserverede navn bevares, også uden enheder. */
export async function removeDevice(key: string, hash: string) {
  await updateUser(key, (user) => {
    user.lastSeen = [
      user.lastSeen ?? user.createdAt,
      ...Object.values(user.devices).map((d) => d.lastSeen),
    ]
      .sort()
      .at(-1)
    delete user.devices[hash]
  })
}
/** Admin deletion participates in the same CAS as every profile update. */
export async function deleteUser(key: string) {
  return (await mutateUser(key, () => undefined)).before
}

export async function listUsers(): Promise<UserRecord[]> {
  if (!redisEnabled) return Object.values((await readLocal()).users)
  const [flat] = (await redis([['HGETALL', 'users']])) as [string[]]
  const out: UserRecord[] = []
  for (let i = 1; i < flat.length; i += 2) out.push(JSON.parse(flat[i]!))
  return out
}

export async function createPairCode(key: string) {
  const expiresAt = new Date(Date.now() + CODE_TTL * 1000).toISOString()
  for (let i = 0; i < 5; i++) {
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0')
    if (!redisEnabled) {
      const created = await mutateLocal((data) => {
        const now = Date.now()
        for (const [c, v] of Object.entries(data.codes)) if (v.exp < now) delete data.codes[c]
        if (data.codes[code]) return false
        data.codes[code] = { key, exp: now + CODE_TTL * 1000 }
        return true
      })
      if (created) return { code, expiresAt }
      continue
    }
    const [ok] = (await redis([['SET', `user-code:${code}`, key, 'EX', CODE_TTL, 'NX']])) as [
      string | null,
    ]
    if (ok) return { code, expiresAt }
  }
  throw createError({ statusCode: 503, statusMessage: 'Prøv igen' })
}

/** Bruger en kode (kun én gang) og giver den nye enhed en nøgle */
export async function redeemPairCode(code: string, ip: string) {
  if (!/^\d{6}$/.test(code)) return undefined
  let key: string | undefined
  if (!redisEnabled) {
    key = await mutateLocal((data) => {
      const entry = data.codes[code]
      delete data.codes[code]
      return entry && entry.exp > Date.now() ? entry.key : undefined
    })
  } else {
    const [fails] = (await redis([['GET', `user-pairfail:${ip}`]])) as [string | null]
    if (Number(fails) >= MAX_PAIR_FAILS) {
      throw createError({
        statusCode: 429,
        statusMessage: 'For mange forkerte koder – vent 10 minutter',
      })
    }
    const [k] = (await redis([['GETDEL', `user-code:${code}`]])) as [string | null]
    key = k ?? undefined
    if (!key)
      await redis([
        ['INCR', `user-pairfail:${ip}`],
        ['EXPIRE', `user-pairfail:${ip}`, CODE_TTL],
      ])
  }
  return key ? addDevice(key) : undefined
}
