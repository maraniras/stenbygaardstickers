import { jackPublic } from '../../utils/bananjack'
import { jackDailyLimit } from '../../utils/jack-limit'
export default defineEventHandler(async event => {
  const { user } = await economyUser(event)
  const record = await syncEconomy(user.name)
  await syncBadgesLater(event)
  const now = new Date()
  return { game: jackPublic(record, now), balance: record.balance, dailyLimit: jackDailyLimit(record, now) }
})
