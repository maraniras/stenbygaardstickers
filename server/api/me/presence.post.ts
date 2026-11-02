export default defineEventHandler(async (event) => {
  const found = await userForToken(readToken(event))
  if (!found) throw createError({ statusCode: 401, statusMessage: 'Ikke logget ind' })
  const body = await readBody(event)
  if (
    typeof body?.tab !== 'string' ||
    !/^[a-zA-Z0-9_-]{16,64}$/.test(body.tab) ||
    typeof body.visible !== 'boolean'
  )
    throw createError({ statusCode: 400, statusMessage: 'Ugyldig appstatus' })
  await setDevicePresence(found.hash, body.tab, body.visible)
  return { ok: true }
})
