/** Badge-notifikationer til denne enhed */
export default defineEventHandler(async (event) => {
  const found = await userForToken(readToken(event))
  if (!found) throw createError({ statusCode: 401, statusMessage: 'Ikke logget ind' })
  const sub = cleanSub(await readBody(event))
  await updateUser(found.key, (u) => {
    const device = u.devices[found.hash]
    if (device) device.push = sub
  })
  return { ok: true }
})
