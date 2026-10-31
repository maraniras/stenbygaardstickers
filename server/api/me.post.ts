/** Vælg navn: låser navnet til denne enhed */
export default defineEventHandler(async (event): Promise<LoginResponse> => {
  if (await userForToken(readToken(event))) {
    throw createError({ statusCode: 409, statusMessage: 'Enheden er allerede logget ind' })
  }
  const body = await readBody<{ name?: unknown }>(event)
  const typed = cleanName(body?.name)
  // Samme stavemåde som på stickers, hvis man er en af dem
  const people = (await listStickers()).flatMap((s) => s.placedBy)
  const name = people.find((n) => nameKey(n) === nameKey(typed)) ?? typed
  const token = await claimName(name)
  if (!token) throw createError({ statusCode: 409, statusMessage: `${name} er allerede taget` })
  // Badges man allerede har, tæller som set
  const found = await userForToken(token)
  if (found) await initBadgeState(found.key, found.user)
  return { name, token }
})
