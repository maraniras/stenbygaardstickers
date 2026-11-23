import {
  ownedProfileBanners,
  type ProfileBannerInventory,
} from '../../shared/utils/profile-banners'
import type { UserRecord } from './users'

export function bannerInventory(user: UserRecord): ProfileBannerInventory {
  const owned = ownedProfileBanners(user)
  return { owned, equipped: user.banner && owned.includes(user.banner) ? user.banner : null }
}
export function equipProfileBanner(user: UserRecord, input: unknown) {
  const owned = ownedProfileBanners(user)
  if (input !== null && (typeof input !== 'string' || !owned.includes(input)))
    throw createError({ statusCode: 403, statusMessage: 'Du ejer ikke dette profilbanner.' })
  user.ownedBanners = owned
  if (input === null) delete user.banner
  else user.banner = input as string
}
