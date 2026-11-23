export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const id = crosswordRequestId(event)
  setHeader(event, 'Cache-Control', 'no-store')
  const state = await readCrossword(id)
  return {
    ...crosswordView(state),
    completions: Object.keys(state.finished).length,
    pushStatus: crosswordPushStatus(state),
    prizeDeliveredAt: state.prizeDeliveredAt ?? null,
  }
})
