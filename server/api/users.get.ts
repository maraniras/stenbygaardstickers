import { equippedProfileFrame } from '../../shared/utils/profile-frames'
import { equippedProfileBanner } from '../../shared/utils/profile-banners'

/** Navne der er taget, med profilbillede */
export default defineEventHandler(async (event): Promise<PublicUser[]> => {
  setHeader(event, 'Cache-Control', 'no-store')
  return (await listUsers()).map((u) => ({
    name: u.name,
    ...(u.deactivatedAt ? { inactive: true } : {}),
    ...(equippedProfileBanner(u) ? { banner: equippedProfileBanner(u) } : {}),
    ...(equippedProfileFrame(u) ? { frame: equippedProfileFrame(u) } : {}),
    ...(u.avatar ? { avatar: u.avatar } : {}),
  }))
})
