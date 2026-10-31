/** Alle kommentarer, nyeste først, med stickerens titel og antal 👍 */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const comments = await allComments()
  const likes = await getLikes(comments.map((c) => c.id))
  const titles = new Map((await listStickers()).map((s) => [s.id, s.title]))
  return comments
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((c) => ({
      ...c,
      stickerTitle: titles.get(c.stickerId) ?? c.stickerId,
      likes: Object.keys(likes[c.id] ?? {}).length,
    }))
})
