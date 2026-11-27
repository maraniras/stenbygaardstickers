export type ParcelRewardKind =
  | 'bananas'
  | 'elf'
  | 'mix-max'
  | 'frame'
  | 'bottle'
  | 'snowglobe'
  | 'golden'
  | 'cake'
  | 'faxe-kondi'
  | 'vampiri'
  | 'juleskum'
  | 'white-wine'
  | 'rta-mug'
  | 'postnord-fan'
  | 'faxe-kondi-shirt'
  | 'faxe-kondi-sweatbands'
  | 'copenhagen-sprint-cap'
  | 'garmin-cap'
export interface ParcelReward {
  kind: ParcelRewardKind
  bottle?: 'sparekassen' | 'totalenergies'
  amount: number
  title: string
}
export interface ParcelPhysicalWinner {
  id: string
  year: number
  parcelId: string
  winner: string | null
  reward: ParcelReward
  openedAt: string | null
  deliveredAt: string | null
}
export interface ParcelAdminCampaign {
  year: number
  phase: 'waiting' | 'registration' | 'playing' | 'ended' | 'cancelled'
  participants: number
  physicalWinners: ParcelPhysicalWinner[]
}
export interface Parcel {
  id: string
  style: number
  owner: string | null
  amount: number
  reward?: ParcelReward
  openingAt?: string
  openedAt?: string
}
export interface ParcelTurn {
  id: string
  die: number
  at: string
  parcel?: string
}
export interface ParcelPending {
  id: string
  deadline: string
  ticket: number
}
export interface ParcelGame {
  /** Bounded badge counters, independent of the last 100 public events. */
  badgeTracking?: import('../utils/parcel-progress').ParcelBadgeTracking
  year: number
  startsAt: string
  endsAt: string
  ended: boolean
  prizesAssigned?: boolean
  cancelled?: boolean
  players: string[]
  /** First time each player held a given gift count. Kept independently of the short event feed. */
  reachedCounts?: Record<string, Record<string, { at: string; order: number }>>
  collectionSequence?: number
  parcels: Parcel[]
  turns: Record<string, Record<string, ParcelTurn[]>>
  pending: Record<string, ParcelPending>
  events: { id: string; from: string | null; to: string; parcel: string; at: string }[]
}
export interface ParcelView {
  year: number
  serverNow: string
  startsAt: string
  registrationStartsAt: string
  registrationEndsAt: string
  registrationOpen: boolean
  joined: boolean
  entryFee: number
  phase: 'waiting' | 'registration' | 'playing' | 'ended' | 'archived'
  collectionUntil?: string
  cancelled?: boolean
  day: string
  remaining: number
  players: string[]
  playerRolls: Record<string, { used: number; total: number }>
  myStats?: { sixes: number; stolen: number; lost: number }
  parcels: {
    id: string
    style: number
    owner: string | null
    amount?: number
    reward?: ParcelReward
    openedAt?: string
  }[]
  pending?: { id: string; deadline: string }
  turn?: ParcelTurn
  events: ParcelGame['events']
}
