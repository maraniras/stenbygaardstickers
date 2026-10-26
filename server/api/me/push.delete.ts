/** Ingen badge-notifikationer til denne enhed */
export default defineEventHandler(async (event) => {
  const found = await userForToken(readToken(event))
  if (!found) throw createError({ statusCode: 401, statusMessage: 'Ikke logget ind' })
  await updateUser(found.key, (u) => {
    delete u.devices[found.hash]?.push
  })
  return { ok: true }
})
