/** Kode til at logge en enhed mere ind som samme bruger */
export default defineEventHandler(async (event): Promise<PairCode> => {
  const found = await userForToken(readToken(event))
  if (!found) throw createError({ statusCode: 401, statusMessage: 'Ikke logget ind' })
  return createPairCode(found.key)
})
