export default defineEventHandler(async (event) => {
  const id = crosswordRequestId(event)
  setHeader(event, 'Cache-Control', 'no-store')
  const preview = getQuery(event).preview === '1'
  if (preview) requireAdmin(event)
  const found = await userForToken(readToken(event))
  const state = await readCrossword(id)
  if (!preview && (await settleCrosswordWinner(state)) && state.winner)
    await syncBadgesLater(event, [state.winner.name])
  if (!preview && found) await settleCrosswordCompletion(state, found.user.name)
  if (!preview) await notifyCrosswordWinnerLater(event, state)
  return crosswordView(state, found?.user.name, preview)
})
