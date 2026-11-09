import type { AdventPhysicalWinner } from '../../shared/types/advent'
import type { EconomyRecord } from '../../shared/types/economy'
import type { AdventDraw } from './advent-draw'

/** Admin-only summary; reading it never creates a draw or opens a door. */
export function adventPhysicalWinners(
  draw: AdventDraw | undefined,
  wallets: Record<string, EconomyRecord>,
): AdventPhysicalWinner[] {
  if (!draw) return []
  const owners = new Map(Object.entries(wallets).map(([name, wallet]) => [nameKey(name), wallet]))
  return draw.awards.flatMap((award, index) => {
    const prize = draw.catalog[award.reward]
    if (prize?.kind !== 'physical') return []
    const opening = owners.get(nameKey(award.winner))?.advent?.[String(draw.year)]?.[
      String(award.day)
    ]
    const found =
      opening &&
      [opening.prize, ...(opening.extras ?? [])].some(
        (item) => item.kind === 'physical' && item.reward === award.reward,
      )
    return [
      {
        id: `${draw.year}:${index}`,
        prize,
        winner: award.winner,
        day: award.day,
        openedAt: found ? opening.openedAt : null,
        deliveredAt: found ? (opening.deliveries?.[`${draw.year}:${index}`] ?? null) : null,
      },
    ]
  })
}

export function setAdventPrizeDelivery(
  wallet: EconomyRecord,
  draw: AdventDraw,
  id: string,
  delivered: boolean,
  now = new Date(),
) {
  const award = adventPhysicalWinners(draw, {}).find((entry) => entry.id === id)
  if (!award) throw createError({ statusCode: 404, statusMessage: 'Præmien findes ikke.' })
  const rows = adventPhysicalWinners(draw, { [award.winner]: wallet })
  const row = rows.find((entry) => entry.id === id)!
  if (!row.openedAt)
    throw createError({ statusCode: 409, statusMessage: 'Vinderen har ikke fundet præmien endnu.' })
  const opening = wallet.advent![String(draw.year)]![String(award.day)]!
  const deliveries = (opening.deliveries ??= {})
  if (delivered) deliveries[id] ??= now.toISOString()
  else delete deliveries[id]
  const sameDoor = rows.filter(
    (entry) => sameName(entry.winner, award.winner) && entry.day === award.day,
  )
  opening.fulfilment = sameDoor.every((entry) => deliveries[entry.id]) ? 'delivered' : 'pending'
}
