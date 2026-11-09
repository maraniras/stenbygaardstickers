export default defineEventHandler(async (event) => {
  requireAdmin(event)
  setHeader(event, 'Cache-Control', 'no-store')
  const body = await readBody<{ id?: unknown; delivered?: unknown }>(event)
  if (typeof body?.id !== 'string' || typeof body?.delivered !== 'boolean')
    throw createError({ statusCode: 400, statusMessage: 'Ugyldig udleveringsstatus.' })
  const draw = await readAdventDraw()
  if (!draw)
    throw createError({ statusCode: 409, statusMessage: 'Lodtrækningen er ikke foretaget.' })
  const award = adventPhysicalWinners(draw, {}).find((entry) => entry.id === body.id)
  if (!award) throw createError({ statusCode: 404, statusMessage: 'Præmien findes ikke.' })
  const id = body.id,
    delivered = body.delivered
  const { record } = await mutateEconomy(award.winner, (wallet) =>
    setAdventPrizeDelivery(wallet, draw, id, delivered),
  )
  return adventPhysicalWinners(draw, { [award.winner]: record }).find((entry) => entry.id === id)
})
