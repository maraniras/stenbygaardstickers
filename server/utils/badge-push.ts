// Besked om nye badges. Serveren udregner badges med samme regler som appen
// (shared/utils/badges.ts) og sammenligner med det, den sidst så for hver bruger:
//  - nye badges og trin → "🧭 Ny badge: …" til brugerens enheder
//  - mistede rekorder → "😱 Nicole har taget din rekord"
// Køres efter godkendelse/ændring/sletning i admin og efter nye stjerner. Samme besked
// sendes højst én gang i døgnet, så en rekord der skifter frem og tilbage ikke spammer.

const RESEND_MS = 24 * 3600_000
const MAX_SINGLE = 3

type Lookup = (name: string) => Badge[]

async function badgeLookup(): Promise<Lookup> {
  const approved = (await listStickers()).filter(s => s.status === 'approved').map(publicSticker)
  const stickers = withDistance(approved)
  const ratings = ratingsEnabled ? await getRatings() : {}
  const comments = await commentStats()
  return name => badgesFor(name, stickers, ratings, { comments })
}

/** Første gang: alt man allerede har tæller som set, så man ikke får 20 beskeder */
export async function initBadgeState(key: string, user: UserRecord) {
  if (user.badgeKeys && user.seenKeys) return user
  const keys = earnedKeys((await badgeLookup())(user.name))
  return await updateUser(key, (u) => {
    u.badgeKeys ??= keys
    u.seenKeys ??= keys
  }) ?? user
}

function stepName(b: Badge, level: number) {
  return b.steps?.[level - 1]?.name ?? b.name
}

function gainedMessage(name: string, b: Badge, key: string): PushMessage {
  const level = Number(key.split(':')[1] ?? 0)
  const url = `${personUrl(name)}?badge=${encodeURIComponent(b.id)}`
  if (b.kind === 'tier') {
    const step = b.steps?.[level - 1]
    return {
      title: `${b.emoji} Ny badge: ${stepName(b, level)}`,
      body: step ? `Du har nået ${step.label}` : b.desc,
      url,
      tag: `badge-${b.id}`,
    }
  }
  if (b.kind === 'record') return { title: `${b.emoji} Ny rekord: ${b.name}`, body: b.desc, url, tag: `badge-${b.id}` }
  return { title: `${b.emoji} Ny badge: ${b.name}`, body: b.desc, url, tag: `badge-${b.id}` }
}

const personUrl = (name: string) => `/person/${encodeURIComponent(name)}`

/** Sender til alle enheder, hvor brugeren har slået notifikationer til */
export async function notifyUser(name: string, message: PushMessage) {
  try {
    const found = await findUser(name)
    if (found) await pushToUser(found.key, found.user, [message])
  }
  catch (err) {
    console.error('Kunne ikke sende besked', err)
  }
}

async function pushToUser(key: string, user: UserRecord, messages: PushMessage[]) {
  const subs = Object.values(user.devices).flatMap(d => (d.push ? [d.push] : []))
  if (!subs.length || !messages.length) return
  const gone = new Set<string>()
  for (const m of messages) for (const e of await sendPush(subs, m)) gone.add(e)
  if (gone.size) {
    await updateUser(key, (u) => {
      for (const d of Object.values(u.devices)) if (d.push && gone.has(d.push.endpoint)) delete d.push
    })
  }
}

/** Finder nye og mistede badges for alle brugere og sender besked */
export async function syncBadges() {
  try {
    const users = await listUsers()
    if (!users.length) return
    const lookup = await badgeLookup()
    const now = Date.now()

    for (const user of users) {
      const key = nameKey(user.name)
      const badges = lookup(user.name)
      const keys = earnedKeys(badges)
      if (!user.badgeKeys) {
        await updateUser(key, (u) => {
          u.badgeKeys = keys
          u.seenKeys ??= keys
        })
        continue
      }
      const known = new Set(user.badgeKeys)
      const current = new Set(keys)
      const byId = new Map(badges.map(b => [b.id, b]))
      const recent = (k: string) => now - Date.parse(user.notifiedAt?.[k] ?? '1970-01-01') < RESEND_MS

      // Kun det højeste nye trin pr. badge
      const gained = new Map<string, string>()
      for (const k of keys) if (!known.has(k)) gained.set(badgeIdOf(k), k)
      const lost = user.badgeKeys.filter(k => !current.has(k) && byId.get(badgeIdOf(k))?.kind === 'record')

      if (!gained.size && !lost.length) continue

      const sendGained = [...gained.values()].filter(k => !recent(k))
      const sendLost = lost.filter(k => !recent(`lost:${k}`))
      const messages: PushMessage[] = []
      if (sendGained.length > MAX_SINGLE) {
        messages.push({
          title: `🏅 ${sendGained.length} nye badges`,
          body: formatList(sendGained.map(k => byId.get(badgeIdOf(k))!).map(b => b.name)),
          url: personUrl(user.name),
          tag: 'badges',
        })
      }
      else {
        for (const k of sendGained) messages.push(gainedMessage(user.name, byId.get(badgeIdOf(k))!, k))
      }
      for (const k of sendLost) {
        const b = byId.get(badgeIdOf(k))!
        if (!b.holders?.length) continue
        messages.push({
          title: `😱 ${formatList(b.holders)} har taget din rekord`,
          body: `${b.emoji} ${b.name} – ${b.desc.charAt(0).toLowerCase()}${b.desc.slice(1)}`,
          url: `${personUrl(user.name)}?badge=${encodeURIComponent(b.id)}`,
          tag: `badge-${b.id}`,
        })
      }

      const updated = await updateUser(key, (u) => {
        u.badgeKeys = keys
        u.notifiedAt ??= {}
        const stamp = new Date(now).toISOString()
        for (const k of sendGained) u.notifiedAt[k] = stamp
        for (const k of sendLost) u.notifiedAt[`lost:${k}`] = stamp
        // Ryd gamle stempler
        for (const [k, at] of Object.entries(u.notifiedAt)) if (now - Date.parse(at) > RESEND_MS) delete u.notifiedAt[k]
      })
      if (updated) await pushToUser(key, updated, messages)
    }
  }
  catch (err) {
    console.error('Kunne ikke tjekke badges', err)
  }
}

/** Kører syncBadges efter svaret, hvis platformen kan (Vercel), ellers venter vi på den */
export async function syncBadgesLater(event: Parameters<typeof getHeader>[0]) {
  const job = syncBadges()
  if (typeof event.waitUntil === 'function') event.waitUntil(job)
  else await job
}
