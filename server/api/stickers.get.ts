/** Godkendte stickers til kortet og listen */
export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  const list = await listStickers()
  return list.filter((s) => s.status === 'approved').map(publicSticker)
})
