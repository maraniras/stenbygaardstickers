export default defineEventHandler(async (event) => {
  const { user } = await economyUser(event)
  const record = await syncEconomy(user.name, undefined, { appOpenedAt: new Date() })
  return dailyResponse(record)
})
