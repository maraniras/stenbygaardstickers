export default defineEventHandler(async (event) => {
  requireAdmin(event)
  setHeader(event, 'Cache-Control', 'private, no-store')
  const state = await readCrossword()
  return crosswordAdminProgress(state, await listUsers())
})
