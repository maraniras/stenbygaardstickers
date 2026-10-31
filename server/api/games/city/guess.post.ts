export default defineEventHandler(async (event) => {
  const { user } = await economyUser(event)
  const body = await readBody<{ day?: unknown; choice?: unknown }>(event)
  const day = gameDay()
  if (body?.day !== day)
    throw createError({
      statusCode: 409,
      statusMessage: 'Dagens spil er skiftet. Hent siden igen.',
    })
  const challenge = await dailyChallenge(day)
  if (typeof body?.choice !== 'string' || !challenge.options.some((c) => c.id === body.choice))
    throw createError({ statusCode: 400, statusMessage: 'Vælg en af dagens seks byer.' })
  const choice = body.choice
  const context = await economyContext()
  const { record } = await mutateEconomy(user.name, (r) => {
    settleEconomy(r, user.name, context)
    applyCityGuess(r, day, choice, challenge.answer.id, user.name, context)
  })
  if (record.days[day]?.city?.finished) await syncBadgesLater(event, [user.name])
  return dailyResponse(record, day)
})
