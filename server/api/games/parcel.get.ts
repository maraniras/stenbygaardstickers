export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  const found = await userForToken(readToken(event))
  return parcelRequest(found?.user.name ?? null, undefined, (names) =>
    syncBadgesLater(event, names),
  )
})
