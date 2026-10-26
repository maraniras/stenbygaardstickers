/** Antal kommentarer pr. sticker – til "💬 3" på kort og liste */
export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  return commentCounts()
})
