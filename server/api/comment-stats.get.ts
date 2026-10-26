/** Tal til kommentar-badges, pr. navn med små bogstaver */
export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  return commentStats()
})
