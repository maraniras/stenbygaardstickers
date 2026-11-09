export default defineEventHandler(async (event) => {
  const { user } = await economyUser(event)
  setHeader(event, 'Cache-Control', 'no-store')
  const body = await readBody<{ ids?: unknown }>(event)
  const ids = Array.isArray(body?.ids)
    ? body.ids
        .filter(
          (id): id is string =>
            typeof id === 'string' && /^advent-gift:[0-9]{4}:[0-9]{1,2}:[a-f0-9]{24}$/.test(id),
        )
        .slice(0, 300)
    : []
  if (!ids.length) return unseenAdventGifts(await readEconomy(user.name))
  const { record } = await mutateEconomy(user.name, (wallet) => markAdventGiftsSeen(wallet, ids))
  return unseenAdventGifts(record)
})
