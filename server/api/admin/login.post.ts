export default defineEventHandler(async (event) => {
  const body = await readBody<{ password?: unknown }>(event)
  const input = typeof body?.password === 'string' ? body.password : ''
  if (!checkPassword(input)) {
    // Lidt ventetid gør det kedeligt at gætte
    await new Promise((r) => setTimeout(r, 800))
    throw createError({ statusCode: 401, statusMessage: 'Forkert adgangskode' })
  }
  setAdminCookie(event)
  return { ok: true }
})
