import { validBoxChoices } from '../../../shared/utils/boxes'

export default defineEventHandler(async (event) => {
  const { user } = await economyUser(event)
  requireBoxesSeason(new Date())
  setHeader(event, 'Cache-Control', 'no-store')
  const body = await readBody<{ day?: unknown; choices?: unknown }>(event)
  const day = gameDay()
  if (body?.day !== day)
    throw createError({
      statusCode: 409,
      statusMessage: 'Dagens bokse er skiftet. Hent siden igen.',
    })
  if (!validBoxChoices(body?.choices))
    throw createError({ statusCode: 400, statusMessage: 'Vælg præcis tre forskellige bokse.' })
  const context = await economyContext()
  const board = await dailyBoxesBoard(day)
  const { record } = await mutateEconomy(user.name, (wallet) => {
    const now = new Date()
    settleEconomy(wallet, user.name, context, now)
    applyBoxesPick(wallet, day, body.choices, board, now)
    settleEconomy(wallet, user.name, context, now)
  })
  await syncBadgesLater(event, [user.name])
  return dailyResponse(record, day)
})
