/** Badges brugeren har set (åbnet fra en notifikation eller lukket pop-up'en) */
const KEY_RE = /^[a-z0-9-]{1,40}(:\d{1,2})?$/

export default defineEventHandler(async (event) => {
  const found = await userForToken(readToken(event))
  if (!found) throw createError({ statusCode: 401, statusMessage: 'Ikke logget ind' })
  const body = await readBody<{ keys?: unknown }>(event)
  const keys = Array.isArray(body?.keys) ? body.keys.filter((k): k is string => typeof k === 'string' && KEY_RE.test(k)).slice(0, 300) : []
  const user = await updateUser(found.key, (u) => {
    u.seenKeys = [...new Set([...(u.seenKeys ?? []), ...keys])]
  })
  return { seen: user?.seenKeys ?? [] }
})
