import type { JackPublic } from '../../shared/types/bananjack'

export interface JackFrame {
  game: JackPublic
  label: string
  delay: number
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
  const push = (label: string, delay = 380) => frames.push({ game: copy(stage), label, delay })
  if (!previous || previous.id !== next.id || previous.sequence !== next.sequence) {
    stage.dealer = []
    stage.hands.forEach((h) => {
      h.cards = []
    })
    push('Emil giver kort…', 120)
    stage.hands[0]!.cards.push(next.hands[0]!.cards[0]!)
    push('Dit første kort')
    stage.dealer.push(next.dealer[0]!)
    push('Emils første kort')
    stage.hands[0]!.cards.push(next.hands[0]!.cards[1]!)
    push('Dit andet kort')
    stage.dealer.push(null)
    push('Emils skjulte kort')
  } else {
    const visible = new Set(previous.hands.flatMap((h) => h.cards))
    for (const hand of stage.hands) hand.cards = hand.cards.filter((card) => visible.has(card))
    stage.dealer = [...previous.dealer]
    if (stage.hands.length !== previous.hands.length) push('Dine kort deles i to hænder', 300)
    for (const [index, hand] of next.hands.entries()) {
      for (const card of hand.cards)
        if (!visible.has(card)) {
          stage.hands[index]!.cards.push(card)
          push(next.hands.length > 1 ? `Kort til hånd ${index + 1}` : 'Et kort til dig')
        }
    }
  }
  if (next.status === 'finished') {
    stage.dealer = next.dealer.slice(0, 2)
    push('Emil vender sit kort…', 650)
    for (let i = 2; i < next.dealer.length; i++) {
      stage.dealer.push(next.dealer[i]!)
      push('Emil trækker et kort…', 650)
    }
  }
  frames.push({ game: copy(next), label: '', delay: 0 })
  return frames
}
