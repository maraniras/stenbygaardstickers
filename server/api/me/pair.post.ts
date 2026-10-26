/** Brug en kode fra en anden enhed */
export default defineEventHandler(async (event): Promise<LoginResponse> => {
  const body = await readBody<{ code?: unknown }>(event)
  const code = typeof body?.code === 'string' ? body.code.replace(/\D/g, '') : ''
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'ukendt'
  const res = await redeemPairCode(code, ip)
  if (!res) {
    // Lidt ventetid gør det kedeligt at gætte
    await new Promise(r => setTimeout(r, 800))
    throw createError({ statusCode: 400, statusMessage: 'Koden passer ikke eller er udløbet' })
  }
  return res
})
