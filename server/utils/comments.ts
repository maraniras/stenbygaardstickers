// Kommentarer på stickers. Kun brugere med et navn kan skrive; alle kan give 👍.
// Redis: hash "comments:<stickerId>" (id → CommentData-JSON), set "commented" med
// sticker-id'er der har kommentarer, og hash "comment-likes:<id>" med
// "u:<navn med små bogstaver>" → visningsnavn eller "d:<deviceId>" → "1".
// Uden Redis bruges Nitros lokale storage i `.data/`.
import { randomBytes } from 'node:crypto'

interface LocalComments {
  comments: Record<string, Record<string, CommentData>>
  likes: Record<string, Record<string, string>>
}

async function readLocal(): Promise<LocalComments> {
  return (await useStorage('data').getItem<LocalComments>('comments')) ?? { comments: {}, likes: {} }
}

async function writeLocal(data: LocalComments) {
  await useStorage('data').setItem('comments', data)
}

export const COMMENT_ID_RE = /^[a-z0-9]{6,24}$/

export function newCommentId() {
  return `${Date.now().toString(36)}${randomBytes(4).toString('hex')}`
}

export async function listComments(stickerId: string): Promise<CommentData[]> {
  let list: CommentData[]
  if (!redisEnabled) {
    list = Object.values((await readLocal()).comments[stickerId] ?? {})
  }
  else {
    const [values] = await redis([['HVALS', `comments:${stickerId}`]]) as [string[]]
    list = values.map(v => JSON.parse(v))
  }
  return list.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

export async function getComment(stickerId: string, id: string) {
  if (!redisEnabled) return (await readLocal()).comments[stickerId]?.[id]
  const [json] = await redis([['HGET', `comments:${stickerId}`, id]]) as [string | null]
  return json ? JSON.parse(json) as CommentData : undefined
}

export async function saveComment(c: CommentData) {
  if (!redisEnabled) {
    const data = await readLocal()
    data.comments[c.stickerId] = { ...data.comments[c.stickerId], [c.id]: c }
    await writeLocal(data)
    return
  }
  await redis([
    ['HSET', `comments:${c.stickerId}`, c.id, JSON.stringify(c)],
    ['SADD', 'commented', c.stickerId],
  ])
}

/** Sletter kommentarer og deres 👍 */
export async function deleteComments(stickerId: string, ids: string[]) {
  if (!ids.length) return
  if (!redisEnabled) {
    const data = await readLocal()
    for (const id of ids) {
      delete data.comments[stickerId]?.[id]
      delete data.likes[id]
    }
    await writeLocal(data)
    return
  }
  await redis([
    ['HDEL', `comments:${stickerId}`, ...ids],
    ...ids.map(id => ['DEL', `comment-likes:${id}`]),
  ])
}

/** Alle 👍 på en række kommentarer: id → felt → værdi */
export async function getLikes(ids: string[]): Promise<Record<string, Record<string, string>>> {
  const out: Record<string, Record<string, string>> = {}
  if (!ids.length) return out
  if (!redisEnabled) {
    const data = await readLocal()
    for (const id of ids) out[id] = data.likes[id] ?? {}
    return out
  }
  const res = await redis(ids.map(id => ['HGETALL', `comment-likes:${id}`])) as string[][]
  ids.forEach((id, i) => {
    const flat = res[i] ?? []
    out[id] = {}
    for (let j = 0; j < flat.length; j += 2) out[id]![flat[j]!] = flat[j + 1]!
  })
  return out
}

/** value undefined fjerner 👍 */
export async function setLike(id: string, fields: { set?: [string, string], remove?: string[] }) {
  if (!redisEnabled) {
    const data = await readLocal()
    const likes = { ...data.likes[id] }
    for (const f of fields.remove ?? []) delete likes[f]
    if (fields.set) likes[fields.set[0]] = fields.set[1]
    data.likes[id] = likes
    await writeLocal(data)
    return
  }
  await redis([
    ...(fields.remove?.length ? [['HDEL', `comment-likes:${id}`, ...fields.remove]] : []),
    ...(fields.set ? [['HSET', `comment-likes:${id}`, fields.set[0], fields.set[1]]] : []),
  ])
}

export function likesView(fields: Record<string, string>, me: { userKey?: string, device?: string }): CommentLikes {
  const entries = Object.entries(fields)
  const names = entries.filter(([k]) => k.startsWith('u:')).map(([, v]) => v)
  return {
    count: entries.length,
    names: names.sort((a, b) => a.localeCompare(b, 'da')),
    anonymous: entries.filter(([k]) => k.startsWith('d:')).length,
    mine: Boolean((me.userKey && fields[`u:${me.userKey}`]) || (me.device && fields[`d:${me.device}`])),
  }
}

/** Alle kommentarer – til badges og backup */
export async function allComments(): Promise<CommentData[]> {
  if (!redisEnabled) return Object.values((await readLocal()).comments).flatMap(c => Object.values(c))
  const [ids] = await redis([['SMEMBERS', 'commented']]) as [string[]]
  if (!ids.length) return []
  const res = await redis(ids.map(id => ['HVALS', `comments:${id}`])) as string[][]
  return res.flatMap(values => (values ?? []).map(v => JSON.parse(v) as CommentData))
}

/** Tal til kommentar-badges, pr. navn med små bogstaver */
export async function commentStats(): Promise<Record<string, CommentStats>> {
  const comments = await allComments()
  const likes = await getLikes(comments.map(c => c.id))
  const out: Record<string, CommentStats> = {}
  const get = (name: string) => (out[nameKey(name)] ??= { comments: 0, tagged: 0, likes: 0, maxLikes: 0 })
  for (const c of comments) {
    const author = get(c.author)
    const n = Object.keys(likes[c.id] ?? {}).length
    author.comments++
    author.likes += n
    author.maxLikes = Math.max(author.maxLikes, n)
    for (const m of c.mentions) if (!sameName(m, c.author)) get(m).tagged++
  }
  return out
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Finder @Navn i teksten blandt brugernes navne (længste navn først, så "@Ole Bob"
 *  ikke bliver til "Ole"). Man kan ikke tagge sig selv. */
export function findMentions(text: string, users: string[], author: string) {
  const found: string[] = []
  let rest = text
  for (const name of [...users].sort((a, b) => b.length - a.length)) {
    const re = new RegExp(`(^|[^\\p{L}\\p{N}])@${escape(name)}(?![\\p{L}\\p{N}])`, 'iu')
    if (!re.test(rest)) continue
    rest = rest.replace(new RegExp(re.source, 'giu'), '$1')
    if (!sameName(name, author) && !found.some(f => sameName(f, name))) found.push(name)
  }
  return found
}

export function cleanCommentText(input: unknown) {
  const text = typeof input === 'string' ? input.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim() : ''
  if (!text) throw createError({ statusCode: 400, statusMessage: 'Skriv noget først' })
  if (text.length > COMMENT_MAX) throw createError({ statusCode: 400, statusMessage: `Højst ${COMMENT_MAX} tegn` })
  return text
}

export const snippet = (text: string, max = 110) => (text.length > max ? `${text.slice(0, max - 1)}…` : text)
