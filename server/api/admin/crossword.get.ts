export default defineEventHandler(async (event) => {
  requireAdmin(event)
  setHeader(event, 'Cache-Control', 'no-store')
  const state = await readCrossword()
  return {
    ...crosswordView(state),
    completions: Object.keys(state.finished).length,
    pushStatus: crosswordPushStatus(state),
  }
})
