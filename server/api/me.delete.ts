/** Log denne enhed ud */
export default defineEventHandler(async (event) => {
  const found = await userForToken(readToken(event))
  if (found) await removeDevice(found.key, found.hash)
  return { ok: true }
})
