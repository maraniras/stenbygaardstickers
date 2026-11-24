import type { AdminTransactions } from '../../../../../shared/types/admin-transactions'

export default defineEventHandler(async (event): Promise<AdminTransactions> => {
  requireAdmin(event)
  setHeader(event, 'Cache-Control', 'no-store')
  const found = await findUser(getRouterParam(event, 'name') ?? '')
  if (!found) throw createError({ statusCode: 404, statusMessage: 'Brugeren findes ikke' })
  const wallet = await readEconomy(found.user.name)
  return {
    name: found.user.name,
    balance: wallet?.balance ?? 0,
    history: [...(wallet?.history ?? [])]
      .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
      .map(({ id, amount, label, at }) => ({ id, amount, label, at })),
  }
})
