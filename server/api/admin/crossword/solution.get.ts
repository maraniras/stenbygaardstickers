export default defineEventHandler((event) => {
  requireAdmin(event)
  setHeader(event, 'Cache-Control', 'private, no-store')
  return {
    puzzle: crosswordView(freshCrossword(), undefined, true).puzzle!,
    solution: crosswordSolution(),
  }
})
