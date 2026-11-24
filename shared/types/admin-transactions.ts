import type { BananaTransaction } from './economy'

export interface AdminTransactions {
  name: string
  balance: number
  history: BananaTransaction[]
}
