export interface ProfileFrame {
  id: string
  name: string
  image: string
  description: string
  /** Photo ellipse in percent of the frame image; includes a small bleed under the rim. */
  portrait: { left: number; top: number; width: number; height: number; mask?: string }
}

export const SHOP_PROFILE_FRAMES: ProfileFrame[] = [
  {
    id: 'bananbande',
    portrait: { left: 15.41, top: 17.57, width: 65.85, height: 64.48 },
    name: 'Bananbande',
    image: '/shop/frames/bananbande-v1.webp',
    description: 'Bananer og tropiske blade i guld og grønt.',
  },
  {
    id: 'casino-royal',
    portrait: { left: 13.9, top: 16.65, width: 71.42, height: 69.62 },
    name: 'Casino Royal',
    image: '/shop/frames/casino-royal-v1.webp',
    description: 'Gyldne detaljer og røde og sorte jetoner.',
  },
  {
    id: 'frostklar',
    portrait: { left: 14.88, top: 16.26, width: 69.27, height: 66.31 },
    name: 'Frostklar',
    image: '/shop/frames/frostklar-v1.webp',
    description: 'Iskrystaller og snefnug i kølige blå nuancer.',
  },
  {
    id: 'galaktisk',
    portrait: { left: 13.58, top: 15.54, width: 70.1, height: 69.5 },
    name: 'Galaktisk',
    image: '/shop/frames/galaktisk-v1.webp',
    description: 'Stjerner, planeter og lilla kosmisk glød.',
  },
  {
    id: 'bananjack',
    portrait: { left: 16.65, top: 17.63, width: 64.55, height: 65.14 },
    name: 'Bananjack',
    image: '/shop/frames/bananjack-v1.webp',
    description: 'Grøn filt, spillekort, jetoner og bananer.',
  },
  {
    id: 'junglekonge',
    portrait: { left: 17.49, top: 17.69, width: 63.06, height: 62.47 },
    name: 'Junglekonge',
    image: '/shop/frames/junglekonge-v1.webp',
    description: 'Tropiske blade, blomster og en gylden krone.',
  },
  {
    id: 'solnedgang',
    portrait: { left: 16.38, top: 19.12, width: 65.28, height: 65.28 },
    name: 'Solnedgang',
    image: '/shop/frames/solnedgang-v1.webp',
    description: 'Varm aftensol, turkise bølger og perlemor.',
  },
  {
    id: 'lava',
    portrait: { left: 13.97, top: 17.69, width: 69.32, height: 68.73 },
    name: 'Lava',
    image: '/shop/frames/lava-v1.webp',
    description: 'Mørk vulkansten med glødende lava og flammer.',
  },
]

const PRIZE_FRAME: ProfileFrame = {
  id: 'parcel-2026',
  portrait: { left: 24.7, top: 24.71, width: 49.29, height: 48.24 },
  name: 'Pakkeleg 2026',
  image: '/games/parcels/exclusive-frame.webp',
  description: 'Eksklusiv profilramme fra pakkelegen 2026.',
}

export const DOOMSDAY_FRAME: ProfileFrame = {
  id: 'doomsday-winner',
  name: 'Doomsday Special · Vinder',
  image: '/games/crossword/marvel/winner-frame.webp',
  description: 'Eksklusiv profilramme til vinderen af På Tværs: Doomsday Special.',
  portrait: {
    left: 12.64,
    top: 14.53,
    width: 72.38,
    height: 70.94,
    mask: '/games/crossword/marvel/winner-portrait-mask.svg',
  },
}

export const ORIGINAL_FRAME: ProfileFrame = {
  id: 'original-winner',
  name: 'På Tværs #1 · Vinder',
  image: '/games/crossword/original/winner-frame.webp',
  description: 'Eksklusiv profilramme til vinderen af det første På Tværs.',
  portrait: {
    left: 11.784750620204026,
    top: 11.784750620204026,
    width: 76.43049875959194,
    height: 76.43049875959194,
    mask: '/games/crossword/original/winner-portrait-mask.svg',
  },
}

export function profileFrame(id: unknown): ProfileFrame | undefined {
  if (id === ORIGINAL_FRAME.id) return ORIGINAL_FRAME
  if (id === PRIZE_FRAME.id) return PRIZE_FRAME
  if (id === DOOMSDAY_FRAME.id) return DOOMSDAY_FRAME
  return SHOP_PROFILE_FRAMES.find((frame) => frame.id === id)
}

/** Same photo placement in previews and avatars, even when the frame extends past the avatar. */
export function profileFramePortraitStyle(frame?: ProfileFrame, scale = 1) {
  const p = frame?.portrait ?? { left: 18, top: 18, width: 64, height: 64 }
  const offset = ((1 - scale) * 100) / 2
  return {
    left: `${offset + p.left * scale}%`,
    top: `${offset + p.top * scale}%`,
    width: `${p.width * scale}%`,
    height: `${p.height * scale}%`,
    ...('mask' in p && p.mask
      ? {
          maskImage: `url("${p.mask}")`,
          WebkitMaskImage: `url("${p.mask}")`,
          maskSize: '100% 100%',
          WebkitMaskSize: '100% 100%',
          maskRepeat: 'no-repeat',
          WebkitMaskRepeat: 'no-repeat',
        }
      : {}),
  }
}

/** Older accounts stored only the equipped prize frame; retain that ownership. */
export function ownedProfileFrames(user: { ownedFrames?: string[]; frame?: string }): string[] {
  return [...new Set([...(user.ownedFrames ?? []), ...(user.frame ? [user.frame] : [])])].filter(
    (id) => !!profileFrame(id),
  )
}

export interface ProfileFrameInventory {
  owned: string[]
  equipped: string | null
}
