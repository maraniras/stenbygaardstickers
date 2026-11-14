export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  const preview = getQuery(event).preview === '1'
  if (preview) requireAdmin(event)
  const found = await userForToken(readToken(event))
  const state = await readCrossword()
  if (!preview && (await settleCrosswordWinner(state)) && state.winner)
    await syncBadgesLater(event, [state.winner.name])
  return crosswordView(state, found?.user.name, preview)
})
