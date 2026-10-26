/** Frigiv et navn: brugeren, alle dens enheder og profilbilledet slettes */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const name = decodeURIComponent(getRouterParam(event, 'name') ?? '')
  const user = await deleteUser(nameKey(name))
  if (!user) throw createError({ statusCode: 404, statusMessage: 'Findes ikke' })
  await deleteAvatar(event, user.avatar)
  return { ok: true }
})
