export default defineEventHandler(async (event) => {
  const { user } = await economyUser(event)
  setHeader(event, 'Cache-Control', 'no-store')
  return unseenAdventGifts(await readEconomy(user.name))
})
