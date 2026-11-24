export default defineEventHandler(async (event) => {
  const id = crosswordRequestId(event)
  setHeader(event, 'Cache-Control', 'no-store')
  const preview = getQuery(event).preview === '1'
  if (preview) requireAdmin(event)
  const body = await readBody<{ answers?: unknown }>(event)
  if (preview)
    return {
      correct: validateCrosswordAnswers(body?.answers, id),
      view: crosswordView(await readCrossword(id), undefined, true),
    }
  const { user } = await economyUser(event)
  const { state, result: correct } = await mutateCrossword(
    (state) => submitCrossword(state, user.name, body?.answers),
    id,
  )
  await settleCrosswordWinner(state)
  if (correct) await settleCrosswordCompletion(state, user.name)
  await notifyCrosswordWinnerLater(event, state)
  if (correct && state.winner?.name === user.name) await syncBadgesLater(event, [user.name])
  return { correct, view: await crosswordViewForUser(state, user.name) }
})
