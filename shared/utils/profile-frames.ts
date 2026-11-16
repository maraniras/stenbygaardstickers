export interface ProfileFrame {
  id: string
  name: string
  image: string
  description: string
}

export const SHOP_PROFILE_FRAMES: ProfileFrame[] = [
  {
    id: 'bananbande',
    name: 'Bananbande',
    image: '/shop/frames/bananbande-v1.webp',
    description: 'Bananer og tropiske blade i guld og grønt.',
  },
  {
    id: 'casino-royal',
    name: 'Casino Royal',
    image: '/shop/frames/casino-royal-v1.webp',
    description: 'Gyldne detaljer og røde og sorte jetoner.',
  },
  {
    id: 'frostklar',
    name: 'Frostklar',
    image: '/shop/frames/frostklar-v1.webp',
    description: 'Iskrystaller og snefnug i kølige blå nuancer.',
  },
  {
    id: 'galaktisk',
    name: 'Galaktisk',
    image: '/shop/frames/galaktisk-v1.webp',
    description: 'Stjerner, planeter og lilla kosmisk glød.',
  },
  {
    id: 'bananjack',
    name: 'Bananjack',
    image: '/shop/frames/bananjack-v1.webp',
    description: 'Grøn filt, spillekort, jetoner og bananer.',
  },
  {
    id: 'junglekonge',
    name: 'Junglekonge',
    image: '/shop/frames/junglekonge-v1.webp',
    description: 'Tropiske blade, blomster og en gylden krone.',
  },
  {
    id: 'solnedgang',
    name: 'Solnedgang',
    image: '/shop/frames/solnedgang-v1.webp',
    description: 'Varm aftensol, turkise bølger og perlemor.',
  },
  {
    id: 'lava',
    name: 'Lava',
    image: '/shop/frames/lava-v1.webp',
    description: 'Mørk vulkansten med glødende lava og flammer.',
  },
]

const PRIZE_FRAME: ProfileFrame = {
  id: 'parcel-2026',
  name: 'Pakkeleg 2026',
  image: '/games/parcels/exclusive-frame.webp',
  description: 'Eksklusiv profilramme fra pakkelegen 2026.',
}

export function profileFrame(id: unknown): ProfileFrame | undefined {
  if (id === PRIZE_FRAME.id) return PRIZE_FRAME
  return SHOP_PROFILE_FRAMES.find((frame) => frame.id === id)
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
