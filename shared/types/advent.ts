export type AdventPrize =
  | { kind: 'bananas'; amount: number; title: string; description: string }
  | { kind: 'physical'; title: string; description: string; instructions: string }
  | { kind: 'surprise'; title: string; description: string }

export interface AdventOpening {
  day: number
  openedAt: string
  prize: AdventPrize
  /** Actual balance change; losses stop at zero bananas. */
  amount: number
  fulfilment?: 'pending'
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
