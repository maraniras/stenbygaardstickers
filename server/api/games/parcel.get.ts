export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  const found = await userForToken(readToken(event))
  if (found?.user.deactivatedAt) requireActivePlayer(found.user)
  return parcelRequest(found?.user.name ?? null, undefined, (names) =>
    syncBadgesLater(event, names),
  )
})
