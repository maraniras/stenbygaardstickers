export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const id = crosswordRequestId(event)
  setHeader(event, 'Cache-Control', 'no-store')
  const body = await readBody<{ delivered?: unknown }>(event)
  if (typeof body?.delivered !== 'boolean')
    throw createError({ statusCode: 400, statusMessage: 'Vælg om præmien er udleveret.' })
  if (id !== '1')
    throw createError({ statusCode: 400, statusMessage: 'Dette krydsord har ingen fysisk præmie.' })
  const now = new Date().toISOString()
  const { state } = await mutateCrossword((current) => {
    if (!current.winner)
      throw createError({ statusCode: 409, statusMessage: 'Krydsordet har ikke en vinder endnu.' })
    if (body.delivered) current.prizeDeliveredAt ??= now
    else delete current.prizeDeliveredAt
  }, id)
  return { deliveredAt: state.prizeDeliveredAt ?? null }
})
