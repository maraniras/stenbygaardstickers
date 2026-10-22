export default defineEventHandler(async (event) => {
  if (!ratingsEnabled) throw createError({ statusCode: 503, statusMessage: 'Stjerner er ikke sat op' })
  const body = await readBody<{ stickerId?: unknown, device?: unknown, stars?: unknown }>(event)
  const { stickerId, device, stars } = body ?? {}
  if (typeof stickerId !== 'string' || !STICKER_RE.test(stickerId)
    || typeof device !== 'string' || !DEVICE_RE.test(device)
    || typeof stars !== 'number' || !Number.isInteger(stars) || stars < 1 || stars > 5) {
    throw createError({ statusCode: 400, statusMessage: 'Ugyldig stjerne' })
  }
  await setRating(stickerId, device, stars)
  return getRatings(device)
})
