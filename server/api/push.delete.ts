/** Slår besked om nye stickers fra for denne telefon */
export default defineEventHandler(async (event) => {
  const body = await readBody<{ endpoint?: unknown }>(event)
  if (typeof body?.endpoint !== 'string') throw createError({ statusCode: 400 })
  await removeSub('all', body.endpoint)
  return { ok: true }
})
