export const DOOMSDAY_PROFILE_BANNER = '/games/crossword/marvel/winner-banner.webp'
export const DOOMSDAY_BANNER_ID = 'doomsday-winner'
export interface ProfileBanner {
  id: string
  name: string
  image: string
  description?: string
}
export const SHOP_PROFILE_BANNERS: ProfileBanner[] = [
  {
    id: 'bananparadis',
    name: 'Bananparadis',
    image: '/shop/banners/bananparadis-v1.webp',
    description: 'Gyldent aftenlys, bananer og frodige tropiske blade.',
  },
  {
    id: 'nordlys',
    name: 'Nordlys',
    image: '/shop/banners/nordlys-v1.webp',
    description: 'Turkis og violet nordlys over en stille bjergsø.',
  },
]
export const PROFILE_BANNERS = [
  ...SHOP_PROFILE_BANNERS,
  {
    id: 'original-winner',
    name: 'På Tværs #1 · Vinder',
    image: '/games/crossword/original/winner-banner.webp',
  },
  {
    id: DOOMSDAY_BANNER_ID,
    name: 'Doomsday Special · Vinder',
    image: DOOMSDAY_PROFILE_BANNER,
  },
] as const

export function profileBanner(id: unknown) {
  return PROFILE_BANNERS.find((item) => item.id === id)
}
export function ownedProfileBanners(user: { ownedBanners?: string[]; banner?: string }) {
  return [...new Set([...(user.ownedBanners || []), ...(user.banner ? [user.banner] : [])])].filter(
    (id) => !!profileBanner(id),
  )
}
/** Display only the selected banner; ownership alone never equips it. */
export function profileBannerFor(user?: { banner?: string }) {
  return profileBanner(user?.banner)?.image
}
export interface ProfileBannerInventory {
  owned: string[]
  equipped: string | null
}
