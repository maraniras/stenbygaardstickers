export default defineEventHandler(async (event) => {
  const { user } = await economyUser(event)
  const request = cleanRouletteRequest(await readBody(event))
  const previous = await readEconomy(user.name)
  if (rouletteRequestSaved(previous, request)) {
    if (previous) await mirrorRoulettePlayer(user.name, previous)
    return rouletteView(user.name)
  }
  const context = await economyContext()
  const { record } = await mutateEconomy(
    user.name,
    (record) => {
      settleEconomy(record, user.name, context)
      placeRouletteBets(record, request)
    },
    { before: rouletteLocksAt(request.round) },
  )
  await mirrorRoulettePlayer(user.name, record)
  return rouletteView(user.name)
})
