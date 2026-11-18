export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  const found = await userForToken(readToken(event))
  if (!found) throw createError({ statusCode: 401, statusMessage: 'Ikke logget ind' })
  const body = await readBody<{ ids?: unknown }>(event)
  const ids = Array.isArray(body?.ids)
    ? body.ids
        .filter((id): id is string => typeof id === 'string' && /^[a-f0-9]{24}$/.test(id))
        .slice(0, ACTIVITY_LIMIT)
    : []
  const user = await updateUser(found.key, (current) => {
    if (!current.devices[found.hash])
      throw createError({ statusCode: 401, statusMessage: 'Ikke logget ind' })
    markActivityRead(current, ids)
  })
  return { items: user?.activity ?? [] }
})
