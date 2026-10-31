export default defineEventHandler(async (event) => {
  const { user } = await economyUser(event)
  const record = await syncEconomy(user.name)
  return dailyResponse(record)
})
