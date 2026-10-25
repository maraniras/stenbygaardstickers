/** By og land for et koordinat – bruges når admin flytter en sticker */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const { lat, lng } = getQuery(event)
  const la = Number(lat)
  const ln = Number(lng)
  if (!Number.isFinite(la) || !Number.isFinite(ln)) throw createError({ statusCode: 400, statusMessage: 'Ugyldigt koordinat' })
  return reverseGeocode(la, ln)
})
