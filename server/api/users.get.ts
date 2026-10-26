/** Navne der allerede er taget */
export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  return (await listUsers()).map(u => u.name)
})
