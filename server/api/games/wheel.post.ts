export default defineEventHandler(async event => {
  const { user } = await economyUser(event)
  const body = await readBody<{ day?: unknown }>(event)
  const day = gameDay()
  if (body?.day !== day) throw createError({ statusCode: 409, statusMessage: 'Dagens spil er skiftet. Hent siden igen.' })
  const context = await economyContext()
  const jackpot = await dailyWheelJackpot(day)
  const { record } = await mutateEconomy(user.name, r => {
    settleEconomy(r, user.name, context)
    applyWheelSpin(r, day, user.name, context, new Date(), undefined, jackpot)
  })
  await syncBadgesLater(event)
  return dailyResponse(record, day)
})
