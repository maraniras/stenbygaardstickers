export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  const preview = getQuery(event).preview === '1'
  if (preview) requireAdmin(event)
  const state = await readCrossword()
  if (!preview && !crosswordView(state).open)
    throw createError({ statusCode: 403, statusMessage: 'Krydsordet er ikke åbnet endnu.' })
  return crosswordLeaderboard(state, await listUsers())
})
