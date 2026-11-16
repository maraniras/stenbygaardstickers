export default defineEventHandler(async (event) => {
  requireAdmin(event)
  setHeader(event, 'Cache-Control', 'no-store')
  return { shuffleMode: await readJackShuffleMode() }
})
