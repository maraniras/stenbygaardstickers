/** Nyt profilbillede (filen er allerede uploadet til avatars/) */
export default defineEventHandler(async (event) => {
  const found = await userForToken(readToken(event))
  if (!found) throw createError({ statusCode: 401, statusMessage: 'Ikke logget ind' })
  const body = await readBody<{ url?: unknown }>(event)
  const url = typeof body?.url === 'string' ? body.url : ''
  if (!isAvatarFile(url)) throw createError({ statusCode: 400, statusMessage: 'Ugyldigt billede' })
  const old = await setAvatar(found.key, found.user, url)
  if (old !== url) await deleteAvatar(event, old)
  return { avatar: url }
})
