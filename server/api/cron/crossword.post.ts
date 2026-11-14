export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  if (!crosswordPushAuthorized(getHeader(event, 'authorization')))
    throw createError({ statusCode: 401 })
  return deliverCrosswordPush(await readBody(event))
})
