import { randomInt } from 'node:crypto'
export default defineEventHandler(async (event) => {
  if (!useRuntimeConfig(event).public.banandittenEnabled)
    throw createError({ statusCode: 403, statusMessage: 'Bananditten kommer snart.' })
  const { user } = await economyUser(event)
  const body = await readBody(event)
  if (
    !body ||
    typeof body.id !== 'string' ||
    !/^[a-zA-Z0-9_-]{16,80}$/.test(body.id) ||
    !(body.previous === null || typeof body.previous === 'string') ||
    !Number.isSafeInteger(body.sequence) ||
    body.sequence < 1 ||
    typeof body.bet !== 'number'
  )
    throw createError({ statusCode: 400, statusMessage: 'Ugyldigt spin. Hent spillet igen.' })
  const context = await economyContext()
  let ticket: number | undefined
  const { record } = await mutateEconomy(user.name, (r) => {
    settleEconomy(r, user.name, context)
    spinSlots(r, body, new Date(), () => (ticket ??= randomInt(10000)))
    settleEconomy(r, user.name, context)
  })
  await syncBadgesLater(event, [user.name])
  return slotResponse(record)
})
