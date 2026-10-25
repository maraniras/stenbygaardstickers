/** Slår besked fra for denne telefon */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const body = await readBody<{ endpoint?: unknown }>(event)
  if (typeof body?.endpoint !== 'string') throw createError({ statusCode: 400 })
  await removeSub(body.endpoint)
  return { ok: true }
})
