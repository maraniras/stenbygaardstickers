export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  if (!seasonalPushAuthorized(getHeader(event, 'authorization')))
    throw createError({ statusCode: 401 })
  return deliverSeasonalPush(await readBody(event))
})
