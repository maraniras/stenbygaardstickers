/** Log denne enhed ud */
export default defineEventHandler(async (event) => {
  const found = await userForToken(readToken(event))
  if (found) {
    const freed = await removeDevice(found.key, found.hash)
    await deleteAvatar(event, freed?.avatar)
  }
  return { ok: true }
})
