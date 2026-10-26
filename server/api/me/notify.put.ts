/** Hvilke typer notifikationer man vil have – gælder alle ens enheder */
export default defineEventHandler(async (event): Promise<NotifyPrefs> => {
  const found = await userForToken(readToken(event))
  if (!found) throw createError({ statusCode: 401, statusMessage: 'Ikke logget ind' })
  const body = await readBody<Record<string, unknown>>(event)
  const changes: NotifyPrefs = {}
  for (const [k, v] of Object.entries(body ?? {})) if (isNotifyType(k) && typeof v === 'boolean') changes[k] = v
  const user = await updateUser(found.key, (u) => {
    u.notify = { ...u.notify, ...changes }
  })
  return user?.notify ?? {}
})
