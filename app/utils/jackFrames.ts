import type { JackPublic } from '../../shared/types/bananjack'

export interface JackFrame {
  game: JackPublic
  label: string
  delay: number
  card?: boolean
}
const copy = (game: JackPublic): JackPublic => JSON.parse(JSON.stringify(game))
/** Presentation only. Every card comes from the already committed server response. */
export function jackFrames(previous: JackPublic | null, next: JackPublic): JackFrame[] {
  const frames: JackFrame[] = []
  const stage = copy(next)
  stage.status = 'playing'
  stage.actions = []
  stage.payout = 0
  for (const hand of stage.hands) {
    delete hand.result
    delete hand.payout
  }
  const push = (label: string, delay = 380, card = false) =>
    frames.push({ game: copy(stage), label, delay, card })
  if (!previous || previous.id !== next.id || previous.sequence !== next.sequence) {
    stage.dealer = []
    stage.hands.forEach((h) => {
      h.cards = []
    })
    push('Dealeren giver kort…', 120)
    stage.hands[0]!.cards.push(next.hands[0]!.cards[0]!)
    push('Dit første kort', 380, true)
    stage.dealer.push(next.dealer[0]!)
    push('Dealerens første kort', 380, true)
    stage.hands[0]!.cards.push(next.hands[0]!.cards[1]!)
    push('Dit andet kort', 380, true)
    stage.dealer.push(null)
    push('Dealerens skjulte kort', 380, true)
  } else {
    const visible = new Set(previous.hands.flatMap((h) => h.cards))
    for (const hand of stage.hands) hand.cards = hand.cards.filter((card) => visible.has(card))
    stage.dealer = [...previous.dealer]
    if (stage.hands.length !== previous.hands.length) push('Dine kort deles i to hænder', 300)
    for (const [index, hand] of next.hands.entries()) {
      for (const card of hand.cards)
        if (!visible.has(card)) {
          stage.hands[index]!.cards.push(card)
          push(next.hands.length > 1 ? `Kort til hånd ${index + 1}` : 'Et kort til dig', 380, true)
        }
    }
  }
  if (next.status === 'finished') {
    stage.dealer = next.dealer.slice(0, 2)
    push('Dealeren vender sit kort…', 650, true)
    for (let i = 2; i < next.dealer.length; i++) {
      stage.dealer.push(next.dealer[i]!)
      push('Dealeren trækker et kort…', 650, true)
    }
  }
  frames.push({ game: copy(next), label: '', delay: 0 })
  return frames
}
