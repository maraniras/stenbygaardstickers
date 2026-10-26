/** Ny kommentar eller svar (kun med et navn) */
export default defineEventHandler(async (event): Promise<CommentView> => {
  const me = await userForToken(readToken(event))
  if (!me) throw createError({ statusCode: 401, statusMessage: 'Vælg dit navn under »Mig« for at skrive' })
  const body = await readBody<{ stickerId?: unknown, text?: unknown, parentId?: unknown }>(event)
  const stickerId = typeof body?.stickerId === 'string' ? body.stickerId : ''
  const sticker = STICKER_RE.test(stickerId) ? await getStored(stickerId) : undefined
  if (!sticker || sticker.status !== 'approved') throw createError({ statusCode: 404, statusMessage: 'Stickeren findes ikke' })
  const text = cleanCommentText(body?.text)

  // Svar på et svar lægges i samme tråd
  let parent: CommentData | undefined
  if (typeof body?.parentId === 'string' && COMMENT_ID_RE.test(body.parentId)) {
    parent = await getComment(stickerId, body.parentId)
    if (!parent) throw createError({ statusCode: 404, statusMessage: 'Kommentaren findes ikke længere' })
  }
  const top = parent?.parentId ? await getComment(stickerId, parent.parentId) : parent

  const users = (await listUsers()).map(u => u.name)
  const c: CommentData = {
    id: newCommentId(),
    stickerId,
    author: me.user.name,
    text,
    ...(top ? { parentId: top.id } : {}),
    mentions: findMentions(text, users, me.user.name),
    createdAt: new Date().toISOString(),
  }
  await saveComment(c)

  const jobs = Promise.all([notifyComment(c, sticker, parent), syncBadges()])
  if (typeof event.waitUntil === 'function') event.waitUntil(jobs)
  else await jobs
  return { ...c, likes: { count: 0, names: [], anonymous: 0, mine: false } }
})
