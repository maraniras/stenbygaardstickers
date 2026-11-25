export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  const found = await userForToken(readToken(event))
  if (found?.user.deactivatedAt) requireActivePlayer(found.user)
  return rouletteView(found?.user.name, async () => {
    if (found) await syncBadgesLater(event, [found.user.name])
  })
})
