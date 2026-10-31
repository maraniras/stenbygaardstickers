export default defineEventHandler((event) => ({ admin: isAdmin(event) }))
