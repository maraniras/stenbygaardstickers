// Gemmer ændringer fra admin. Godkendelse er bare status: 'approved'.
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const id = getRouterParam(event, 'id') ?? ''
  const old = await getStored(id)
  if (!old) throw createError({ statusCode: 404, statusMessage: 'Sticker findes ikke' })

  const body = await readBody<Record<string, unknown>>(event)
  const input = cleanInput(body)
  const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
  let place = {
    city: str(body?.city, 80),
    country: str(body?.country, 80),
    countryCode: str(body?.countryCode, 2).toUpperCase(),
  }
  if (!place.city || !place.country || !/^[A-Z]{2}$/.test(place.countryCode)) {
    place = await reverseGeocode(input.lat, input.lng)
  }

  const sticker: StoredSticker = {
    ...old,
    ...input,
    ...place,
    status: body?.status === 'approved' ? 'approved' : 'pending',
  }
  await saveSticker(sticker)
  await deleteUnused(event, old.media, sticker.media)
  // Første gang en sticker godkendes, får alle der har sagt ja besked
  if (old.status !== 'approved' && sticker.status === 'approved') {
    const by = formatList(sticker.placedBy)
    await notify('all', {
      title: `📍 Emil er landet i ${sticker.city || sticker.title}!`,
      body: `${sticker.title}${by ? ` – sat op af ${by}` : ''}`,
      url: `/sticker/${sticker.id}`,
    })
  }
  return sticker
})
