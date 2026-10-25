/** Alle stickers inkl. dem der venter på godkendelse */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  setHeader(event, 'Cache-Control', 'no-store')
  return listStickers()
})
