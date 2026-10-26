/** Hvem er denne enhed? */
export default defineEventHandler(async (event): Promise<MeResponse> => {
  setHeader(event, 'Cache-Control', 'no-store')
  const found = await userForToken(readToken(event))
  if (!found) return { name: null }
  await touchDevice(found.key, found.hash, found.user)
  const user = await initBadgeState(found.key, found.user)
  return {
    name: user.name,
    ...(user.avatar ? { avatar: user.avatar } : {}),
    push: Boolean(user.devices[found.hash]?.push),
    seen: user.seenKeys ?? [],
  }
})
