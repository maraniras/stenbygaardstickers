export default defineEventHandler(async (event) => {
  requireAdmin(event)
  setHeader(event, 'Cache-Control', 'no-store')
  const body = await readBody<{ id?: unknown; delivered?: unknown }>(event)
  if (
    typeof body?.id !== 'string' ||
    !/^\d{4}:p[1-9]\d*$/.test(body.id) ||
    typeof body.delivered !== 'boolean'
  )
    throw createError({ statusCode: 400, statusMessage: 'Ugyldig udleveringsstatus.' })
  const game = (await parcelBackup())[body.id.slice(0, 4)]
  if (!game) throw createError({ statusCode: 404, statusMessage: 'Pakkelegen findes ikke.' })
  const award = parcelPhysicalWinners(game, {}).find((entry) => entry.id === body.id)
  if (!award?.winner)
    throw createError({ statusCode: 409, statusMessage: 'Præmien har ingen endelig vinder.' })
  const id = body.id,
    delivered = body.delivered,
    winner = award.winner
  const { record } = await mutateEconomy(winner, (wallet) =>
    setParcelPrizeDelivery(wallet, game, id, delivered),
  )
  return parcelPhysicalWinners(game, { [nameKey(winner)]: record }).find((entry) => entry.id === id)
})
