/** Navne der er taget, med profilbillede */
export default defineEventHandler(async (event): Promise<PublicUser[]> => {
  setHeader(event, 'Cache-Control', 'no-store')
  return (await listUsers()).map((u) => ({
    name: u.name,
    ...(u.frame ? { frame: u.frame } : {}),
    ...(u.avatar ? { avatar: u.avatar } : {}),
  }))
})
