/** 👍 på en kommentar – også uden at være logget ind (pr. enhed). Ikke på sin egen. */
export default defineEventHandler(async (event): Promise<CommentLikes> => {
  const id = getRouterParam(event, 'id') ?? ''
  const body = await readBody<{ stickerId?: unknown; device?: unknown; on?: unknown }>(event)
  const stickerId = typeof body?.stickerId === 'string' ? body.stickerId : ''
  const device = typeof body?.device === 'string' && DEVICE_RE.test(body.device) ? body.device : ''
  const c =
    STICKER_RE.test(stickerId) && COMMENT_ID_RE.test(id)
      ? await getComment(stickerId, id)
      : undefined
  if (!c) throw createError({ statusCode: 404, statusMessage: 'Kommentaren findes ikke' })
  const me = await userForToken(readToken(event))
  if (!me && !device) throw createError({ statusCode: 400 })
  if (me && nameKey(c.author) === me.key)
    throw createError({
      statusCode: 403,
      statusMessage: 'Du kan ikke give 👍 til din egen kommentar',
    })

  const before = (await getLikes([id]))[id] ?? {}
  const userField = me ? `u:${me.key}` : undefined
  const deviceField = device ? `d:${device}` : undefined
  const had = Boolean((userField && before[userField]) || (deviceField && before[deviceField]))
  const on = body?.on === true
  if (on && !had) {
    // Logget ind tæller som navnet – en tidligere anonym 👍 fra samme enhed fjernes
    await setLike(
      id,
      me
        ? { set: [userField!, me.user.name], remove: deviceField ? [deviceField] : [] }
        : { set: [deviceField!, '1'] },
    )
  } else if (!on && had) {
    await setLike(id, { remove: [userField, deviceField].filter((f): f is string => Boolean(f)) })
  }

  const likes = likesView((await getLikes([id]))[id] ?? {}, { userKey: me?.key, device })
  if (on && !had) {
    const jobs = Promise.all([notifyLike(c, likes, me?.user.name), syncBadges()])
    if (typeof event.waitUntil === 'function') event.waitUntil(jobs)
    else await jobs
  } else if (!on && had) {
    await syncBadgesLater(event)
  }
  return likes
})
