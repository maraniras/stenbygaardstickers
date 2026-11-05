export interface CasinoDailyLimit {
  amount: number
  /** Settled losses minus winnings; negative means a profit today. */
  netLoss: number
  /** Stakes held in unfinished hands, including hands carried past 04:00. */
  reserved: number
  remaining: number
  nextResetAt: string
  /** Compatibility for older clients; use netLoss for the current UI. */
  spent: number
}
