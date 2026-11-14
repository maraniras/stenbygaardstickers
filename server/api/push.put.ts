/** Anonymous preferences are bound to the existing device subscription. */
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const sub = cleanSub(body)
  if (!(await hasSub('all', sub.endpoint)))
    throw createError({ statusCode: 400, statusMessage: 'Slå notifikationer til først.' })
  const changes: NotifyPrefs = {}
  for (const type of ['stickers', 'updates', 'crossword'] as const)
    if (typeof body.notify?.[type] === 'boolean') changes[type] = body.notify[type]
  return setPublicPushPrefs(sub.endpoint, changes)
})
