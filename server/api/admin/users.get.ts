import { compareAdminUsers } from '../../../shared/utils/admin-user-order'
export default defineEventHandler(async (event): Promise<UserSummary[]> => {
  requireAdmin(event)
  return (await listUsers())
    .map((u) => {
      const devices = Object.values(u.devices)
      return {
        name: u.name,
        ...(u.deactivatedAt ? { deactivatedAt: u.deactivatedAt } : {}),
        createdAt: u.createdAt,
        devices: devices.length,
        lastSeen: [u.lastSeen ?? u.createdAt, ...devices.map((d) => d.lastSeen)].sort().at(-1)!,
      }
    })
    .sort(compareAdminUsers)
})
