export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  const found = await userForToken(readToken(event))
  const now = new Date()
  const configs = found ? await adventConfigsFor(found.user.name, now) : undefined
  return adventResponse(found ? await readEconomy(found.user.name) : undefined, now, configs)
})
