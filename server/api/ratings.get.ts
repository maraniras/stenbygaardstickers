export default defineEventHandler(async (event) => {
  if (!ratingsEnabled) throw createError({ statusCode: 503, statusMessage: '👍 er ikke sat op' })
  const { device } = getQuery(event)
  setHeader(event, 'Cache-Control', 'no-store')
  const me = await userForToken(readToken(event))
  return getRatings({ device: typeof device === 'string' && DEVICE_RE.test(device) ? device : undefined, userKey: me?.key })
})
