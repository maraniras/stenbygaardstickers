export default defineEventHandler(async (event) => {
  if (!useRuntimeConfig(event).public.banandittenEnabled)
    throw createError({ statusCode: 403, statusMessage: 'Bananditten kommer snart.' })
  const { user } = await economyUser(event)
  return slotResponse(await syncEconomy(user.name))
})
