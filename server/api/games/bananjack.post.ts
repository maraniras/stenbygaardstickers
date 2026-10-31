import { dealJack, actJack, jackPublic } from '../../utils/bananjack'
import { jackDailyLimit } from '../../utils/jack-limit'
import type { JackAction } from '../../../shared/types/bananjack'
export default defineEventHandler(async (event) => {
  if (!useRuntimeConfig(event).public.bananjackEnabled)
    throw createError({ statusCode: 403, statusMessage: 'Bananjack kommer snart.' })
  const { user } = await economyUser(event)
  const body = await readBody(event)
  if (!body || typeof body.id !== 'string' || !/^[a-zA-Z0-9_-]{16,80}$/.test(body.id))
    throw createError({ statusCode: 400, statusMessage: 'Ugyldig hånd. Hent spillet igen.' })
  if (body.action === 'deal') {
    if (
      !(body.previous === null || typeof body.previous === 'string') ||
      typeof body.bet !== 'number'
    )
      throw createError({ statusCode: 400, statusMessage: 'Ugyldig indsats.' })
  } else if (
    !['hit', 'stand', 'double', 'split'].includes(body.action) ||
    !Number.isSafeInteger(body.revision) ||
    body.revision < 0
  )
    throw createError({ statusCode: 400, statusMessage: 'Ugyldigt træk.' })
  const context = await economyContext()
  const { record } = await mutateEconomy(user.name, (r) => {
    settleEconomy(r, user.name, context)
    if (body.action === 'deal') dealJack(r, body.id, body.previous, body.bet)
    else actJack(r, body.id, body.revision, body.action as JackAction)
    settleEconomy(r, user.name, context)
  })
  await syncBadgesLater(event, [user.name])
  const now = new Date()
  return {
    game: jackPublic(record, now),
    balance: record.balance,
    dailyLimit: jackDailyLimit(record, now),
  }
})
