/** Tager en backup med det samme */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  return storeBackup(event)
})
