export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  const body = await readBody<{ answers?: unknown; device?: unknown }>(event)
  const found = await userForToken(readToken(event))
  if (!found && (typeof body?.device !== 'string' || !/^[a-zA-Z0-9-]{16,80}$/.test(body.device)))
    throw createError({ statusCode: 400, statusMessage: 'Enheden kunne ikke genkendes.' })
  const subject = found ? `u:${found.key}` : `d:${body.device}`
  const { result } = await mutateCrossword((state) => crosswordHelp(state, subject, body?.answers))
  return result
})
