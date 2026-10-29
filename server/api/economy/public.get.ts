export default defineEventHandler(async event => {
  setHeader(event, 'Cache-Control', 'no-store')
  await syncAllEconomies()
  const registered = new Set((await listUsers()).map(u => nameKey(u.name)))
  return Object.fromEntries(Object.entries(await publicEconomies()).filter(([name]) => registered.has(name)))
})
