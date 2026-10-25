/** Afviser en indsendt sticker eller sletter en godkendt – inkl. uploadede medier */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const id = getRouterParam(event, 'id') ?? ''
  const old = await getStored(id)
  if (!old) throw createError({ statusCode: 404, statusMessage: 'Sticker findes ikke' })
  await removeSticker(id)
  await deleteUnused(old.media)
  return { ok: true }
})
