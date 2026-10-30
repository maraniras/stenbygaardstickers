import { jackPublic } from '../../utils/bananjack'
export default defineEventHandler(async event => {
  const { user } = await economyUser(event)
  const record = await syncEconomy(user.name)
  await syncBadgesLater(event)
  return { game: jackPublic(record), balance: record.balance }
})
