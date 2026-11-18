export default defineEventHandler(async (event) => {
  const { user } = await economyUser(event)
  const body = await readBody(event)
  const day = gameDay()
  if (body?.day !== day)
    throw createError({ statusCode: 409, statusMessage: 'Dagens ord er skiftet. Hent siden igen.' })
  if (
    typeof body?.guess !== 'string' ||
    body.guess.length > 20 ||
    !Number.isSafeInteger(body?.count) ||
    body.count < 0 ||
    body.count > 5
  )
    throw createError({ statusCode: 400, statusMessage: 'Ugyldigt gæt.' })
  const [answer, context] = await Promise.all([dailyWordleAnswer(day), economyContext()])
  const { record } = await mutateEconomy(user.name, (r) => {
    settleEconomy(r, user.name, context)
    applyWordleGuess(r, day, body.guess, body.count, answer)
    settleEconomy(r, user.name, context)
    trimGameDays(r, day)
  })
  if (record.days[day]?.wordle?.finished) await syncBadgesLater(event, [user.name])
  return dailyResponse(record, day)
})
