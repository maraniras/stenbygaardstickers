export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const id = crosswordRequestId(event)
  setHeader(event, 'Cache-Control', 'no-store')
  const body = await readBody<{ opensAt?: unknown }>(event)
  const { state } = await mutateCrossword((state) => scheduleCrossword(state, body?.opensAt), id)
  const pushStatus = await scheduleCrosswordPushes(state)
  return { ...crosswordView(state), pushStatus, prizeDeliveredAt: state.prizeDeliveredAt ?? null }
})
