export default defineEventHandler(async (event) => {
  requireAdmin(event)
  setHeader(event, 'Cache-Control', 'no-store')
  const body = await readBody(event)
  return { shuffleMode: await saveJackShuffleMode(body?.shuffleMode) }
})
