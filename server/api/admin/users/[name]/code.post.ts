/** Gendan adgang til den eksisterende profil uden at frigive navnet eller slette data. */
export default defineEventHandler(async (event): Promise<PairCode> => {
  requireAdmin(event)
  const name = getRouterParam(event, 'name') ?? ''
  const found = await findUser(name)
  if (!found) throw createError({ statusCode: 404, statusMessage: 'Brugeren findes ikke' })
  return createPairCode(found.key)
})
