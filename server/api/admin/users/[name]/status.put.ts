/** Reversible deactivation; never deletes the user's history or releases their name. */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  setHeader(event, 'Cache-Control', 'no-store')
  const body = await readBody<{ active?: unknown }>(event)
  if (typeof body?.active !== 'boolean')
    throw createError({ statusCode: 400, statusMessage: 'Vælg aktiv eller deaktiveret.' })
  const found = await findUser(getRouterParam(event, 'name') ?? '')
  if (!found) throw createError({ statusCode: 404, statusMessage: 'Brugeren findes ikke.' })
  const user = await setUserActive(found.key, body.active)
  if (!user) throw createError({ statusCode: 404, statusMessage: 'Brugeren findes ikke længere.' })
  return { name: user.name, deactivatedAt: user.deactivatedAt ?? null }
})
