import {
  ownedProfileBanners,
  equippedProfileBanner,
  type ProfileBannerInventory,
} from '../../shared/utils/profile-banners'
import type { UserRecord } from './users'

export function bannerInventory(user: UserRecord): ProfileBannerInventory {
  const owned = ownedProfileBanners(user)
  return { owned, equipped: equippedProfileBanner(user) ?? null }
}
export function equipProfileBanner(user: UserRecord, input: unknown) {
  const owned = ownedProfileBanners(user)
  if (input !== null && (typeof input !== 'string' || !owned.includes(input)))
    throw createError({ statusCode: 403, statusMessage: 'Du ejer ikke dette profilbanner.' })
  user.ownedBanners = owned
  user.bannerHidden = input === null
  if (input === null) delete user.banner
  else user.banner = input as string
}
