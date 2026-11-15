export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  const found = await userForToken(readToken(event))
  return rouletteView(found?.user.name, async () => {
    if (found) await syncBadgesLater(event, [found.user.name])
  })
})
