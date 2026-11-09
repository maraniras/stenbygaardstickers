export default defineEventHandler(async (event) => {
  const { user } = await economyUser(event)
  setHeader(event, 'Cache-Control', 'no-store')
  const body = await readBody<{ year?: unknown; day?: unknown; to?: unknown }>(event)
  const recipient = await findUser(cleanName(body?.to))
  if (!recipient)
    throw createError({ statusCode: 404, statusMessage: 'Modtageren skal have en bruger.' })
  const context = await economyContext()
  const { result: delivery } = await mutateEconomy(user.name, (wallet) =>
    reserveAdventGift(wallet, user.name, recipient.user.name, body?.year, body?.day),
  )
  const receipt = await deliverAdventGift(delivery, context)
  const { record } = await mutateEconomy(user.name, (wallet) => {
    const opening = wallet.advent?.[String(delivery.year)]?.[String(delivery.day)]
    if (opening?.gift && sameName(opening.gift.to, delivery.to))
      opening.gift.deliveredAt ??= receipt.receivedAt
    settleEconomy(wallet, user.name, context)
  })
  await syncBadgesLater(event, [user.name, delivery.to])
  return adventResponse(record, new Date(), await adventConfigsFor(user.name))
})
