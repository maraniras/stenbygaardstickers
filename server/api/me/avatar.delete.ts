/** Fjern profilbilledet */
export default defineEventHandler(async (event) => {
  const found = await userForToken(readToken(event))
  if (!found) throw createError({ statusCode: 401, statusMessage: 'Ikke logget ind' })
  await deleteAvatar(event, await setAvatar(found.key, found.user, undefined))
  return { ok: true }
})
