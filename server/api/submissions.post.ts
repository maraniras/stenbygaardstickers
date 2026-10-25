// Ny sticker fra upload-siden. Den venter på godkendelse i admin.
export default defineEventHandler(async (event) => {
  const input = cleanInput(await readBody(event))
  const place = await reverseGeocode(input.lat, input.lng)
  const sticker: StoredSticker = {
    id: await newStickerId(input.date, place.city, input.title),
    ...input,
    ...place,
    status: 'pending',
    submittedAt: new Date().toISOString(),
  }
  await saveSticker(sticker)
  return { id: sticker.id }
})
