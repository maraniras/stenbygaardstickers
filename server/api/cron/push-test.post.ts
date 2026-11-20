export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  if (!oneOffPushAuthorized(getHeader(event, 'authorization')))
    throw createError({ statusCode: 401 })
  return deliverOneOffPush(await readBody(event))
})
