export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const id = crosswordRequestId(event)
  setHeader(event, 'Cache-Control', 'private, no-store')
  const state = await readCrossword(id)
  return crosswordAdminProgress(state, await listUsers())
})
