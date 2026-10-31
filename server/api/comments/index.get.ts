/** Kommentarer på en sticker med 👍 */
export default defineEventHandler(async (event): Promise<CommentView[]> => {
  setHeader(event, 'Cache-Control', 'no-store')
  const { sticker, device } = getQuery(event)
  if (typeof sticker !== 'string' || !STICKER_RE.test(sticker))
    throw createError({ statusCode: 400 })
  const me = await userForToken(readToken(event))
  const comments = await listComments(sticker)
  const likes = await getLikes(comments.map((c) => c.id))
  const who = {
    userKey: me?.key,
    device: typeof device === 'string' && DEVICE_RE.test(device) ? device : undefined,
  }
  return comments.map((c) => ({ ...c, likes: likesView(likes[c.id] ?? {}, who) }))
})
