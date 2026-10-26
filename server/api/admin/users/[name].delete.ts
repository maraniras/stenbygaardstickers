/** Frigiv et navn: brugeren og alle dens enheder slettes */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const name = decodeURIComponent(getRouterParam(event, 'name') ?? '')
  if (!(await deleteUser(nameKey(name)))) throw createError({ statusCode: 404, statusMessage: 'Findes ikke' })
  return { ok: true }
})
