/** Giv 1–5 👍 – eller 0 for at fjerne sin vurdering. Man kan ikke give 👍 til sine egne.
 *  Logget ind gemmes den på brugeren (én stemme uanset antal enheder). */
export default defineEventHandler(async (event) => {
  if (!ratingsEnabled) throw createError({ statusCode: 503, statusMessage: '👍 er ikke sat op' })
  const body = await readBody<{
    stickerId?: unknown
    device?: unknown
    value?: unknown
    stars?: unknown
  }>(event)
  const { stickerId, device } = body ?? {}
  const value = body?.value ?? body?.stars
  if (
    typeof stickerId !== 'string' ||
    !STICKER_RE.test(stickerId) ||
    typeof device !== 'string' ||
    !DEVICE_RE.test(device) ||
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < 0 ||
    value > 5
  ) {
    throw createError({ statusCode: 400, statusMessage: 'Ugyldig vurdering' })
  }
  const user = await userForToken(readToken(event))
  if (user) {
    const sticker = await getStored(stickerId)
    if (sticker?.placedBy.some((n) => sameName(n, user.user.name))) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Du kan ikke give 👍 til din egen sticker',
      })
    }
  }
  const voter = { device, userKey: user?.key }
  await setRating(stickerId, voter, value)
  // 👍 kan give badges (Publikumsfavorit, Magnet …) og tage rekorder
  await syncBadgesLater(event)
  return getRatings(voter)
})
