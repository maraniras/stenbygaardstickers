/** Slår besked til for denne telefon */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  await addSub('admin', cleanSub(await readBody(event)))
  return { ok: true }
})
