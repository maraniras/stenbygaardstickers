export type JackAction = 'hit' | 'stand' | 'double' | 'split'
export interface JackHand {
  cards: number[]
  bet: number
  fromSplit: boolean
  doubled?: boolean
  status: 'playing' | 'stood' | 'bust'
  result?: 'blackjack' | 'win' | 'lose' | 'push'
  payout?: number
}
export interface JackGame {
  id: string
  sequence: number
  revision: number
  deck: number[]
  dealer: number[]
  hands: JackHand[]
  active: number
  status: 'playing' | 'finished'
  staked: number
  payout: number
}
export interface JackPublic extends Omit<JackGame, 'deck' | 'dealer'> {
  dealer: (number | null)[]
  actions: JackAction[]
}
export interface JackResponse { game: JackPublic | null, balance: number }
