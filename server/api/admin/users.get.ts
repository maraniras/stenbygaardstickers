export default defineEventHandler(async (event): Promise<UserSummary[]> => {
  requireAdmin(event)
  return (await listUsers())
    .map((u) => {
      const devices = Object.values(u.devices)
      return {
        name: u.name,
        createdAt: u.createdAt,
        devices: devices.length,
        lastSeen: devices.map(d => d.lastSeen).sort().at(-1) ?? u.createdAt,
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'da'))
})
