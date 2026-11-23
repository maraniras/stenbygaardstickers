export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  const found = await userForToken(readToken(event))
  if (!found) throw createError({ statusCode: 401, statusMessage: 'Ikke logget ind' })
  const body = await readBody(event)
  if (!body || !(body.banner === null || typeof body.banner === 'string'))
    throw createError({
      statusCode: 400,
      statusMessage: 'Vælg et profilbanner eller intet banner.',
    })
  const user = await updateUser(found.key, (current) => {
    if (!current.devices[found.hash])
      throw createError({ statusCode: 401, statusMessage: 'Ikke logget ind' })
    equipProfileBanner(current, body.banner)
  })
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Brugeren findes ikke længere' })
  return bannerInventory(user)
})
