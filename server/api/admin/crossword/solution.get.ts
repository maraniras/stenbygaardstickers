export default defineEventHandler((event) => {
  requireAdmin(event)
  const id = crosswordRequestId(event)
  setHeader(event, 'Cache-Control', 'private, no-store')
  return {
    puzzle: crosswordView(freshCrossword(id), undefined, true).puzzle!,
    solution: crosswordSolution(id),
  }
})
