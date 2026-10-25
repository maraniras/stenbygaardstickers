/** Hele databasen som fil til download */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const backup = await createBackup()
  setHeader(event, 'Content-Type', 'application/json')
  setHeader(event, 'Content-Disposition', `attachment; filename="stickers-${backup.createdAt.slice(0, 10)}.json"`)
  setHeader(event, 'Cache-Control', 'no-store')
  return JSON.stringify(backup, null, 2)
})
