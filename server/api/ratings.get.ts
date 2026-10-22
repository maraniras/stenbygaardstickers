export default defineEventHandler(async (event) => {
  if (!ratingsEnabled) throw createError({ statusCode: 503, statusMessage: 'Stjerner er ikke sat op' })
  const { device } = getQuery(event)
  setHeader(event, 'Cache-Control', 'no-store')
  return getRatings(typeof device === 'string' && DEVICE_RE.test(device) ? device : undefined)
})
