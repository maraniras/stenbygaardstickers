/** Lige logget ind: denne enheds 👍 flyttes over på brugeren */
export default defineEventHandler(async (event) => {
  if (!ratingsEnabled) return { moved: 0 }
  const me = await userForToken(readToken(event))
  if (!me) throw createError({ statusCode: 401, statusMessage: 'Ikke logget ind' })
  const body = await readBody<{ device?: unknown }>(event)
  const device = typeof body?.device === 'string' && DEVICE_RE.test(body.device) ? body.device : ''
  if (!device) throw createError({ statusCode: 400 })
  const own = new Set((await listStickers()).filter(s => s.placedBy.some(n => sameName(n, me.user.name))).map(s => s.id))
  const moved = await claimRatings(device, me.key, own)
  if (moved) await syncBadgesLater(event)
  return { moved }
})
