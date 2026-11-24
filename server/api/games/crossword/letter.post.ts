export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  const id = crosswordRequestId(event)
  const { user } = await economyUser(event)
  if (getQuery(event).preview === '1')
    throw createError({
      statusCode: 403,
      statusMessage: 'Preview giver ikke adgang til bogstavkøb.',
    })
  const body = await readBody<{ cell?: unknown; price?: unknown }>(event)
  const shop = await buyCrosswordLetter(await readCrossword(id), user.name, body?.cell, body?.price)
  await syncBadgesLater(event, [user.name])
  return shop
})
