// 👍 (1–5) gemmes i Upstash Redis (Vercel Marketplace). Uden Redis-nøgler
// bruges Nitros lokale storage, så det også virker under `npm run dev`.
// Redis: hash "rating:<stickerId>" med felt → antal 👍, og et set "rated" med alle
// sticker-id'er, der har fået 👍. (Nøglerne er fra dengang det var stjerner.)
// Feltet er enhedens id, eller "u:<navn med små bogstaver>" for brugere med et navn –
// så tæller en bruger kun én gang, uanset hvor mange enheder de har.

export const ratingsEnabled = redisEnabled || import.meta.dev

/** Hvem spørger: enheden og evt. brugeren */
export interface RatingVoter {
  device?: string
  userKey?: string
}

export const userRatingField = (userKey: string) => `u:${userKey}`

function summarize(values: number[], mine?: number): RatingSummary {
  const sum = values.reduce((a, b) => a + b, 0)
  return { avg: values.length ? sum / values.length : 0, count: values.length, mine }
}

type LocalData = Record<string, Record<string, number>>

async function readLocal() {
  return (await useStorage('data').getItem<LocalData>('ratings')) ?? {}
}

export async function getRatings(voter: RatingVoter = {}) {
  const out: Record<string, RatingSummary> = {}
  const userField = voter.userKey ? userRatingField(voter.userKey) : '-'
  const deviceField = voter.device || '-'
  if (!redisEnabled) {
    for (const [id, fields] of Object.entries(await readLocal())) {
      if (!Object.keys(fields).length) continue
      out[id] = summarize(Object.values(fields), fields[userField] ?? fields[deviceField])
    }
    return out
  }
  const [ids] = (await redis([['SMEMBERS', 'rated']])) as [string[]]
  if (!ids.length) return out
  const mineFields = [voter.userKey ? userField : undefined, voter.device].filter(
    (field): field is string => !!field,
  )
  const stride = mineFields.length ? 2 : 1
  const res = await redis(
    ids.flatMap((id) => [
      ['HVALS', `rating:${id}`],
      ...(mineFields.length ? [['HMGET', `rating:${id}`, ...mineFields]] : []),
    ]),
  )
  ids.forEach((id, i) => {
    const values = (res[i * stride] as string[]).map(Number)
    if (!values.length) return
    const mine = mineFields.length
      ? (res[i * stride + 1] as (string | null)[]).find((value) => value !== null)
      : undefined
    out[id] = summarize(values, mine ? Number(mine) : undefined)
  })
  return out
}

/** Gemmer en vurdering (value 0 fjerner den). Logget ind gemmes den på brugeren,
 *  og en gammel vurdering fra enheden på samme sticker fjernes. */
export async function setRating(stickerId: string, voter: RatingVoter, value: number) {
  const field = voter.userKey ? userRatingField(voter.userKey) : voter.device!
  const extra = voter.userKey && voter.device ? [voter.device] : []
  if (!redisEnabled) {
    const storage = useStorage('data')
    const data = await readLocal()
    const fields = { ...data[stickerId] }
    for (const f of extra) delete fields[f]
    if (value) fields[field] = value
    else delete fields[field]
    data[stickerId] = fields
    await storage.setItem('ratings', data)
    return
  }
  await redis([
    ...(extra.length ? [['HDEL', `rating:${stickerId}`, ...extra]] : []),
    ...(value
      ? [
          ['HSET', `rating:${stickerId}`, field, value],
          ['SADD', 'rated', stickerId],
        ]
      : [['HDEL', `rating:${stickerId}`, field]]),
  ])
}

/** Når man logger ind: enhedens 👍 flyttes over på brugeren (har brugeren allerede
 *  givet 👍 til samme sticker fra en anden enhed, beholdes den og enhedens fjernes).
 *  👍 til ens egne stickers fjernes. Giver antal flyttede. */
export async function claimRatings(device: string, userKey: string, own: Set<string>) {
  const userField = userRatingField(userKey)
  let moved = 0
  if (!redisEnabled) {
    const data = await readLocal()
    for (const [id, fields] of Object.entries(data)) {
      const v = fields[device]
      if (v === undefined) continue
      delete fields[device]
      if (!own.has(id) && fields[userField] === undefined) {
        fields[userField] = v
        moved++
      }
    }
    await useStorage('data').setItem('ratings', data)
    return moved
  }
  const [ids] = (await redis([['SMEMBERS', 'rated']])) as [string[]]
  if (!ids.length) return 0
  const res = (await redis(ids.map((id) => ['HMGET', `rating:${id}`, device, userField]))) as (
    string | null
  )[][]
  const cmds: (string | number)[][] = []
  ids.forEach((id, i) => {
    const [v, previous] = res[i]!
    if (v === null || v === undefined) return
    cmds.push(['HDEL', `rating:${id}`, device])
    if (!own.has(id) && previous === null) {
      cmds.push(['HSET', `rating:${id}`, userField, v])
      moved++
    }
  })
  if (cmds.length) await redis(cmds)
  return moved
}
