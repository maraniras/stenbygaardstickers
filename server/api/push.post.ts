/** Slår besked om nye stickers til for denne telefon */
export default defineEventHandler(async (event) => {
  await addSub('all', cleanSub(await readBody(event)))
  return { ok: true }
})
