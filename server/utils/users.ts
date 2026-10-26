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

interface UserDevice {
  addedAt: string
  lastSeen: string
  /** Push-abonnement til badge-notifikationer på denne enhed */
  push?: PushSubscription
}

export interface UserRecord {
  name: string
  createdAt: string
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
}

interface LocalUsers {
  users: Record<string, UserRecord>
  tokens: Record<string, string>
  codes: Record<string, { key: string, exp: number }>
}

const CODE_TTL = 10 * 60
const MAX_PAIR_FAILS = 10
export const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/
const NAME_RE = /^\p{L}[\p{L}\p{M} '.-]{0,29}$/u

async function readLocal(): Promise<LocalUsers> {
  return (await useStorage('data').getItem<LocalUsers>('users')) ?? { users: {}, tokens: {}, codes: {} }
}

async function writeLocal(data: LocalUsers) {
  await useStorage('data').setItem('users', data)
}

export function cleanName(input: unknown) {
  const name = typeof input === 'string' ? input.trim().replace(/\s+/g, ' ').normalize('NFC') : ''
  if (!NAME_RE.test(name)) throw createError({ statusCode: 400, statusMessage: 'Skriv et navn med bogstaver (højst 30 tegn)' })
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
  }
  else {
    const [k] = await redis([['HGET', 'user-tokens', hash]]) as [string | null]
    key = k ?? undefined
    if (key) {
      const [json] = await redis([['HGET', 'users', key]]) as [string | null]
      user = json ? JSON.parse(json) : undefined
    }
  }
  if (!key || !user?.devices[hash]) return undefined
  return { key, hash, user }
}

/** Opdaterer "sidst set" højst et par gange i døgnet */
export async function touchDevice(key: string, hash: string, user: UserRecord) {
  const device = user.devices[hash]
  if (!device || Date.now() - Date.parse(device.lastSeen) < 12 * 3600_000) return
  device.lastSeen = new Date().toISOString()
  await saveUser(key, user)
}

/** Skifter profilbilledet og giver det gamle tilbage, så det kan slettes */
export async function setAvatar(key: string, user: UserRecord, avatar: string | undefined) {
  const old = user.avatar
  if (avatar) user.avatar = avatar
  else delete user.avatar
  await saveUser(key, user)
  return old
}

/** Læser brugeren frisk, ændrer den og gemmer – så samtidige ændringer (fx en ny
 *  enhed) ikke overskrives af en, der har læst en gammel udgave */
export async function updateUser(key: string, change: (user: UserRecord) => void) {
  const user = await getUser(key)
  if (!user) return undefined
  change(user)
  // Er navnet frigivet i mellemtiden, må det ikke genopstå
  if (!(await getUser(key))) return undefined
  await saveUser(key, user)
  return user
}

async function saveUser(key: string, user: UserRecord) {
  if (!redisEnabled) {
    const data = await readLocal()
    data.users[key] = user
    await writeLocal(data)
    return
  }
  await redis([['HSET', 'users', key, JSON.stringify(user)]])
}

/** Låser navnet til en ny enhed. Giver undefined, hvis navnet er taget. */
export async function claimName(name: string) {
  const key = nameKey(name)
  const token = randomBytes(32).toString('base64url')
  const hash = hashToken(token)
  const now = new Date().toISOString()
  const user: UserRecord = { name, createdAt: now, devices: { [hash]: { addedAt: now, lastSeen: now } } }
  if (!redisEnabled) {
    const data = await readLocal()
    if (data.users[key]) return undefined
    data.users[key] = user
    data.tokens[hash] = key
    await writeLocal(data)
    return token
  }
  const [created] = await redis([['HSETNX', 'users', key, JSON.stringify(user)]]) as [number]
  if (!created) return undefined
  await redis([['HSET', 'user-tokens', hash, key]])
  return token
}

/** Ny nøgle til en enhed mere på samme bruger */
async function addDevice(key: string) {
  const user = await getUser(key)
  if (!user) return undefined
  const token = randomBytes(32).toString('base64url')
  const hash = hashToken(token)
  const now = new Date().toISOString()
  user.devices[hash] = { addedAt: now, lastSeen: now }
  if (!redisEnabled) {
    const data = await readLocal()
    data.users[key] = user
    data.tokens[hash] = key
    await writeLocal(data)
  }
  else {
    await redis([
      ['HSET', 'users', key, JSON.stringify(user)],
      ['HSET', 'user-tokens', hash, key],
    ])
  }
  return { name: user.name, token }
}

/** Brugeren med dette navn, hvis nogen har valgt det */
export async function findUser(name: string) {
  const key = nameKey(name)
  const user = await getUser(key)
  return user ? { key, user } : undefined
}

async function getUser(key: string) {
  if (!redisEnabled) return (await readLocal()).users[key]
  const [json] = await redis([['HGET', 'users', key]]) as [string | null]
  return json ? JSON.parse(json) as UserRecord : undefined
}

/** Logger enheden ud. Var det den sidste enhed, bliver navnet ledigt igen –
 *  så gives brugeren tilbage, så profilbilledet kan slettes. */
export async function removeDevice(key: string, hash: string) {
  const user = await getUser(key)
  if (!user) return undefined
  delete user.devices[hash]
  const empty = !Object.keys(user.devices).length
  if (!redisEnabled) {
    const data = await readLocal()
    delete data.tokens[hash]
    if (empty) delete data.users[key]
    else data.users[key] = user
    await writeLocal(data)
  }
  else {
    await redis([
      ['HDEL', 'user-tokens', hash],
      empty ? ['HDEL', 'users', key] : ['HSET', 'users', key, JSON.stringify(user)],
    ])
  }
  return empty ? user : undefined
}

/** Sletter brugeren og alle dens enheder (admin) */
export async function deleteUser(key: string) {
  const user = await getUser(key)
  if (!user) return undefined
  const hashes = Object.keys(user.devices)
  if (!redisEnabled) {
    const data = await readLocal()
    for (const h of hashes) delete data.tokens[h]
    delete data.users[key]
    await writeLocal(data)
    return user
  }
  await redis([
    ['HDEL', 'users', key],
    ...(hashes.length ? [['HDEL', 'user-tokens', ...hashes]] : []),
  ])
  return user
}

export async function listUsers(): Promise<UserRecord[]> {
  if (!redisEnabled) return Object.values((await readLocal()).users)
  const [flat] = await redis([['HGETALL', 'users']]) as [string[]]
  const out: UserRecord[] = []
  for (let i = 1; i < flat.length; i += 2) out.push(JSON.parse(flat[i]!))
  return out
}

export async function createPairCode(key: string) {
  const expiresAt = new Date(Date.now() + CODE_TTL * 1000).toISOString()
  for (let i = 0; i < 5; i++) {
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0')
    if (!redisEnabled) {
      const data = await readLocal()
      const now = Date.now()
      for (const [c, v] of Object.entries(data.codes)) if (v.exp < now) delete data.codes[c]
      if (data.codes[code]) continue
      data.codes[code] = { key, exp: now + CODE_TTL * 1000 }
      await writeLocal(data)
      return { code, expiresAt }
    }
    const [ok] = await redis([['SET', `user-code:${code}`, key, 'EX', CODE_TTL, 'NX']]) as [string | null]
    if (ok) return { code, expiresAt }
  }
  throw createError({ statusCode: 503, statusMessage: 'Prøv igen' })
}

/** Bruger en kode (kun én gang) og giver den nye enhed en nøgle */
export async function redeemPairCode(code: string, ip: string) {
  if (!/^\d{6}$/.test(code)) return undefined
  let key: string | undefined
  if (!redisEnabled) {
    const data = await readLocal()
    const entry = data.codes[code]
    delete data.codes[code]
    await writeLocal(data)
    key = entry && entry.exp > Date.now() ? entry.key : undefined
  }
  else {
    const [fails] = await redis([['GET', `user-pairfail:${ip}`]]) as [string | null]
    if (Number(fails) >= MAX_PAIR_FAILS) {
      throw createError({ statusCode: 429, statusMessage: 'For mange forkerte koder – vent 10 minutter' })
    }
    const [k] = await redis([['GETDEL', `user-code:${code}`]]) as [string | null]
    key = k ?? undefined
    if (!key) await redis([['INCR', `user-pairfail:${ip}`], ['EXPIRE', `user-pairfail:${ip}`, CODE_TTL]])
  }
  return key ? addDevice(key) : undefined
}
