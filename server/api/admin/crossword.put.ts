export default defineEventHandler(async (event) => {
  requireAdmin(event)
  setHeader(event, 'Cache-Control', 'no-store')
  const body = await readBody<{ opensAt?: unknown }>(event)
  const { state } = await mutateCrossword((state) => scheduleCrossword(state, body?.opensAt))
  const pushStatus = await scheduleCrosswordPushes(state)
  return { ...crosswordView(state), pushStatus }
})
