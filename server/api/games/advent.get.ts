export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  const found = await userForToken(readToken(event))
  return adventResponse(found ? await readEconomy(found.user.name) : undefined)
})
