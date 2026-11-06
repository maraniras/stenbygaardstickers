export default defineEventHandler(async (event) => {
  const { user } = await economyUser(event)
  const body = await readBody<{ year?: unknown; day?: unknown }>(event)
  // This route never accepts client dates, rewards, amounts or a preview bypass.
  const context = await economyContext()
  const now = new Date()
  const { record } = await mutateEconomy(user.name, (wallet) => {
    settleEconomy(wallet, user.name, context, now)
    openAdventDoor(wallet, body?.year, body?.day, now)
    settleEconomy(wallet, user.name, context, now)
  })
  await syncBadgesLater(event, [user.name])
  return adventResponse(record, now)
})
