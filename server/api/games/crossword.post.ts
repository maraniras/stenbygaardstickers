export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  const preview = getQuery(event).preview === '1'
  if (preview) requireAdmin(event)
  const body = await readBody<{ answers?: unknown }>(event)
  if (preview)
    return {
      correct: validateCrosswordAnswers(body?.answers),
      view: crosswordView(await readCrossword(), undefined, true),
    }
  const { user } = await economyUser(event)
  const { state, result: correct } = await mutateCrossword((state) =>
    submitCrossword(state, user.name, body?.answers),
  )
  await settleCrosswordWinner(state)
  if (correct && state.winner?.name === user.name) await syncBadgesLater(event, [user.name])
  return { correct, view: crosswordView(state, user.name) }
})
