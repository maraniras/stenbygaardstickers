export type AdventReward =
  | 'banana-single'
  | 'banana-small'
  | 'banana-large'
  | 'elf'
  | 'mix-max'
  | 'red-wine'
  | 'white-wine'
  | 'cycling-bottle'
  | 'santa'
  | 'friend-gift'
  | 'self-gift'
export type AdventPrize = (
  | { kind: 'bananas'; amount: number; title: string; description: string }
  | { kind: 'physical'; amount?: number; title: string; description: string; instructions: string }
  | { kind: 'surprise'; title: string; description: string }
  | { kind: 'friend-gift'; amount: number; title: string; description: string }
) & { reward?: AdventReward }

export interface AdventOpening {
  day: number
  openedAt: string
  prize: AdventPrize
  /** Actual balance change; losses stop at zero bananas. */
  amount: number
  fulfilment?: 'pending' | 'delivered'
  /** Delivery timestamps per physical award id, including multiple prizes in one door. */
  deliveries?: Record<string, string>
  gift?: { to: string; deliveredAt?: string }
  extras?: AdventPrize[]
}

export interface AdventStats {
  doors: number
  given: number
  received: number
  self: number
  elves: number
  santas: number
  physical: number
}

export interface AdventGiftReceipt {
  id: string
  from: string
  amount: number
  year: number
  day: number
  receivedAt: string
  seenAt?: string
}
export interface AdventDoor {
  day: number
  unlocksAt: string
  available: boolean
  configured: boolean
  opening: AdventOpening | null
}
export interface AdventResponse {
  year: number
  serverNow: string
  nextRefreshAt: string
  previewAllowed: boolean
  availableDay: number
  doors: AdventDoor[]
}

export interface AdventPhysicalWinner {
  id: string
  prize: AdventPrize
  winner: string
  day: number
  openedAt: string | null
  deliveredAt: string | null
}
