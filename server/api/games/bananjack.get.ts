import { jackPublic } from '../../utils/bananjack'
import { jackDailyLimit } from '../../utils/jack-limit'
export default defineEventHandler(async (event) => {
  if (!useRuntimeConfig(event).public.bananjackEnabled)
    throw createError({ statusCode: 403, statusMessage: 'Bananjack kommer snart.' })
  const { user } = await economyUser(event)
  const record = await syncEconomy(user.name)
  const now = new Date()
  return {
    game: jackPublic(record, now),
    balance: record.balance,
    dailyLimit: jackDailyLimit(record, now),
  }
})
