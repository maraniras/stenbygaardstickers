/** Ret sin egen kommentar – kun de første 10 minutter */
export default defineEventHandler(async (event): Promise<CommentData> => {
  const me = await userForToken(readToken(event))
  if (!me) throw createError({ statusCode: 401, statusMessage: 'Ikke logget ind' })
  const id = getRouterParam(event, 'id') ?? ''
  const body = await readBody<{ stickerId?: unknown, text?: unknown }>(event)
  const stickerId = typeof body?.stickerId === 'string' ? body.stickerId : ''
  const old = STICKER_RE.test(stickerId) && COMMENT_ID_RE.test(id) ? await getComment(stickerId, id) : undefined
  if (!old) throw createError({ statusCode: 404, statusMessage: 'Kommentaren findes ikke' })
  if (nameKey(old.author) !== me.key) throw createError({ statusCode: 403, statusMessage: 'Det er ikke din kommentar' })
  // Lidt luft, så et tryk lige før tiden løber ud stadig går igennem
  if (Date.now() - Date.parse(old.createdAt) > COMMENT_EDIT_MS + 30_000) {
    throw createError({ statusCode: 403, statusMessage: 'Kommentarer kan kun rettes de første 10 minutter' })
  }
  const text = cleanCommentText(body?.text)
  const users = (await listUsers()).map(u => u.name)
  const c: CommentData = { ...old, text, mentions: findMentions(text, users, old.author), editedAt: new Date().toISOString() }
  await saveComment(c)

  // Kun nye tags får besked
  const added = c.mentions.filter(m => !old.mentions.some(o => sameName(o, m)))
  const sticker = await getStored(stickerId)
  const jobs = Promise.all([
    added.length && sticker ? notifyComment(c, sticker, undefined, added) : Promise.resolve(),
    syncBadges(),
  ])
  if (typeof event.waitUntil === 'function') event.waitUntil(jobs)
  else await jobs
  return c
})
