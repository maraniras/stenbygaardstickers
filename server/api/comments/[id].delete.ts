/** Slet en kommentar (sin egen, eller enhver som admin). Svar under den slettes også. */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') ?? ''
  const { sticker } = getQuery(event)
  const stickerId = typeof sticker === 'string' ? sticker : ''
  const c = STICKER_RE.test(stickerId) && COMMENT_ID_RE.test(id) ? await getComment(stickerId, id) : undefined
  if (!c) throw createError({ statusCode: 404, statusMessage: 'Kommentaren findes ikke' })
  const me = await userForToken(readToken(event))
  if (!isAdmin(event) && (!me || nameKey(c.author) !== me.key)) {
    throw createError({ statusCode: 403, statusMessage: 'Det er ikke din kommentar' })
  }
  const replies = c.parentId ? [] : (await listComments(stickerId)).filter(r => r.parentId === c.id).map(r => r.id)
  await deleteComments(stickerId, [c.id, ...replies])
  await syncBadgesLater(event)
  return { ok: true, deleted: [c.id, ...replies] }
})
