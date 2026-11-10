export default defineEventHandler(async (event) => {
  const { user } = await economyUser(event)
  setHeader(event, 'Cache-Control', 'no-store')
  const body = await readBody<{ kind?: unknown; day?: unknown; id?: unknown; parcel?: unknown }>(
    event,
  )
  if (
    !body ||
    !['roll', 'pick', 'enroll', 'open'].includes(String(body.kind)) ||
    typeof body.id !== 'string' ||
    !/^[a-zA-Z0-9-]{16,64}$/.test(body.id)
  )
    throw createError({ statusCode: 400, statusMessage: 'Ugyldigt slag. Hent bordet igen.' })
  return parcelRequest(
    user.name,
    {
      kind: body.kind as 'roll' | 'pick' | 'enroll' | 'open',
      day: body.day,
      id: body.id,
      parcel: body.parcel,
    },
    (names) => syncBadgesLater(event, names),
  )
})
