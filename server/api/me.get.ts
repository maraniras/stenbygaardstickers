/** Hvem er denne enhed? */
export default defineEventHandler(async (event): Promise<MeResponse> => {
  setHeader(event, 'Cache-Control', 'no-store')
  const found = await userForToken(readToken(event))
  if (!found) return { name: null }
  await touchDevice(found.key, found.hash, found.user)
  return { name: found.user.name }
})
