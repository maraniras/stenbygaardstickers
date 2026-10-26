// Besked om nye badges, rekorder og levels. Serveren udregner badges med samme regler
// som appen (shared/utils/badges.ts) og sammenligner med det, den sidst så for hver bruger:
//  - nye badges og trin → "🧭 Ny badge: …"
//  - nye og mistede rekorder → "🏆 Ny rekord" / "😱 Nicole har taget din rekord"
//  - nyt level → "⬆️ Level 3: Gadeplakat"
// Køres efter godkendelse/ændring/sletning i admin, efter 👍 og efter kommentarer. Samme
// besked sendes højst én gang i døgnet, så en rekord der skifter frem og tilbage ikke
// spammer. Hver type kan slås fra under Notifikationer (user.notify).

const RESEND_MS = 24 * 3600_000
const MAX_SINGLE = 3

type Lookup = (name: string) => Badge[]
interface Typed { type: NotifyType, message: PushMessage }

async function badgeLookup(): Promise<Lookup> {
  const approved = (await listStickers()).filter(s => s.status === 'approved').map(publicSticker)
  const stickers = withDistance(approved)
  const ratings = ratingsEnabled ? await getRatings() : {}
  const comments = await commentStats()
  return name => badgesFor(name, stickers, ratings, { comments })
}

/** Første gang: alt man allerede har tæller som set, så man ikke får 20 beskeder */
export async function initBadgeState(key: string, user: UserRecord) {
  if (user.badgeKeys && user.seenKeys && user.level) return user
  const badges = (await badgeLookup())(user.name)
  const keys = earnedKeys(badges)
  const level = levelFor(totalPoints(badges)).level
  return await updateUser(key, (u) => {
    u.badgeKeys ??= keys
    u.seenKeys ??= keys
    u.level ??= level
  }) ?? user
}

function stepName(b: Badge, level: number) {
  return b.steps?.[level - 1]?.name ?? b.name
}

function gainedMessage(name: string, b: Badge, key: string): Typed {
  const level = Number(key.split(':')[1] ?? 0)
  const url = `${personUrl(name)}?badge=${encodeURIComponent(b.id)}`
  if (b.kind === 'tier') {
    const step = b.steps?.[level - 1]
    return {
      type: 'badges',
      message: { title: `${b.emoji} Ny badge: ${stepName(b, level)}`, body: step ? `Du har nået ${step.label}` : b.desc, url, tag: `badge-${b.id}` },
    }
  }
  if (b.kind === 'record') return { type: 'records', message: { title: `${b.emoji} Ny rekord: ${b.name}`, body: b.desc, url, tag: `badge-${b.id}` } }
  return { type: 'badges', message: { title: `${b.emoji} Ny badge: ${b.name}`, body: b.desc, url, tag: `badge-${b.id}` } }
}

const personUrl = (name: string) => `/person/${encodeURIComponent(name)}`

/** Sender til alle enheder, hvor brugeren har slået notifikationer til – hvis brugeren
 *  vil have den type */
export async function notifyUser(name: string, message: PushMessage, type: NotifyType) {
  try {
    const found = await findUser(name)
    if (found && wants(found.user.notify, type)) await pushToUser(found.key, found.user, [message])
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

/** Enheder hvor brugeren har slået en type fra – til lister som "nye stickers" */
export async function mutedEndpoints(type: NotifyType) {
  const out = new Set<string>()
  for (const u of await listUsers()) {
    if (wants(u.notify, type)) continue
    for (const d of Object.values(u.devices)) if (d.push) out.add(d.push.endpoint)
  }
  return out
}

/** Finder nye og mistede badges og nye levels for alle brugere og sender besked */
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
      const level = levelFor(totalPoints(badges))
      if (!user.badgeKeys || !user.level) {
        await updateUser(key, (u) => {
          u.badgeKeys ??= keys
          u.seenKeys ??= keys
          u.level ??= level.level
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
      const levelUp = level.level > user.level

      if (!gained.size && !lost.length && level.level === user.level) continue

      const sendGained = [...gained.values()].filter(k => !recent(k))
      const sendLost = lost.filter(k => !recent(`lost:${k}`))
      const sendLevel = levelUp && !recent(`level:${level.level}`)
      const out: Typed[] = []
      if (sendGained.length > MAX_SINGLE) {
        out.push({
          type: 'badges',
          message: {
            title: `🏅 ${sendGained.length} nye badges`,
            body: formatList(sendGained.map(k => byId.get(badgeIdOf(k))!).map(b => b.name)),
            url: personUrl(user.name),
            tag: 'badges',
          },
        })
      }
      else {
        for (const k of sendGained) out.push(gainedMessage(user.name, byId.get(badgeIdOf(k))!, k))
      }
      for (const k of sendLost) {
        const b = byId.get(badgeIdOf(k))!
        if (!b.holders?.length) continue
        out.push({
          type: 'records',
          message: {
            title: `😱 ${formatList(b.holders)} har taget din rekord`,
            body: `${b.emoji} ${b.name} – ${b.desc.charAt(0).toLowerCase()}${b.desc.slice(1)}`,
            url: `${personUrl(user.name)}?badge=${encodeURIComponent(b.id)}`,
            tag: `badge-${b.id}`,
          },
        })
      }
      if (sendLevel) {
        out.push({
          type: 'levels',
          message: {
            title: `⬆️ Level ${level.level}: ${level.title}`,
            body: level.next ? `Du har ${level.points} point – ${level.next.at - level.points} til ${level.next.title}` : 'Du har nået toppen 👑',
            url: personUrl(user.name),
            tag: 'level',
          },
        })
      }

      const updated = await updateUser(key, (u) => {
        u.badgeKeys = keys
        u.level = level.level
        u.notifiedAt ??= {}
        const stamp = new Date(now).toISOString()
        for (const k of sendGained) u.notifiedAt[k] = stamp
        for (const k of sendLost) u.notifiedAt[`lost:${k}`] = stamp
        if (sendLevel) u.notifiedAt[`level:${level.level}`] = stamp
        // Ryd gamle stempler
        for (const [k, at] of Object.entries(u.notifiedAt)) if (now - Date.parse(at) > RESEND_MS) delete u.notifiedAt[k]
      })
      if (updated) await pushToUser(key, updated, out.filter(o => wants(updated.notify, o.type)).map(o => o.message))
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
