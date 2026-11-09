import { createHash } from 'node:crypto'
import type { AdventGiftReceipt } from '../../shared/types/advent'
import type { EconomyRecord } from '../../shared/types/economy'
import type { EconomyContext } from './economy'

export interface AdventGiftDelivery {
  id: string
  from: string
  to: string
  amount: number
  year: number
  day: number
}

/** Reserve the recipient in the sender CAS before touching the other wallet.
 * Retrying completes the same delivery, never changes the recipient or amount. */
export function reserveAdventGift(
  wallet: EconomyRecord,
  from: string,
  to: string,
  year: unknown,
  day: unknown,
): AdventGiftDelivery {
  if (
    !Number.isInteger(year) ||
    Number(year) < 2026 ||
    Number(year) > 2100 ||
    !Number.isInteger(day) ||
    Number(day) < 1 ||
    Number(day) > 24
  )
    throw createError({ statusCode: 400, statusMessage: 'Ugyldig gavelåge.' })
  if (sameName(from, to))
    throw createError({ statusCode: 400, statusMessage: 'Vælg en anden bruger end dig selv.' })
  const opening = wallet.advent?.[String(year)]?.[String(day)]
  if (!opening || opening.prize.kind !== 'friend-gift')
    throw createError({
      statusCode: 403,
      statusMessage: 'Du har ikke åbnet en gave til en ven i denne låge.',
    })
  const amount = opening.prize.amount
  if (!Number.isSafeInteger(amount) || amount <= 0)
    throw createError({ statusCode: 500, statusMessage: 'Gavens beløb er ikke sat korrekt op.' })
  if (opening.gift && !sameName(opening.gift.to, to))
    throw createError({
      statusCode: 409,
      statusMessage: 'Gaven er allerede valgt til en anden bruger.',
    })
  opening.gift ??= { to }
  const owner = createHash('sha256').update(nameKey(from)).digest('hex').slice(0, 24)
  return {
    id: `advent-gift:${year}:${day}:${owner}`,
    from,
    to: opening.gift.to,
    amount,
    year: Number(year),
    day: Number(day),
  }
}

/** Credit + history + durable unread receipt commit together. No sender debit.
 * The receipt is the idempotency key across retries and simultaneous devices. */
export async function deliverAdventGift(
  delivery: AdventGiftDelivery,
  context: EconomyContext,
  now = new Date(),
) {
  const { result } = await mutateEconomy(delivery.to, (wallet) => {
    const saved = wallet.adventGifts?.[delivery.id]
    if (saved) return { receipt: saved, created: false }
    if (
      !Number.isSafeInteger(delivery.amount) ||
      delivery.amount <= 0 ||
      !Number.isSafeInteger(wallet.balance + delivery.amount)
    )
      throw createError({ statusCode: 500, statusMessage: 'Gavens beløb er ugyldigt.' })
    settleEconomy(wallet, delivery.to, context, now)
    creditBananas(wallet, delivery.id, delivery.amount, `Julegave fra ${delivery.from}`, now)
    const receipt: AdventGiftReceipt = {
      id: delivery.id,
      from: delivery.from,
      amount: delivery.amount,
      year: delivery.year,
      day: delivery.day,
      receivedAt: now.toISOString(),
    }
    ;(wallet.adventGifts ??= {})[delivery.id] = receipt
    settleEconomy(wallet, delivery.to, context, now)
    return { receipt, created: true }
  })
  if (result.created)
    await notifyUser(
      delivery.to,
      {
        title: `🎁 ${delivery.from} har givet dig en julegave!`,
        body: `Du har fået ${delivery.amount.toLocaleString('da-DK')} bananer. Glædelig jul!`,
        url: `/spil/bananer?gift=${encodeURIComponent(delivery.id)}`,
        tag: delivery.id,
      },
      'gifts',
    )
  return result.receipt
}

export function unseenAdventGifts(wallet?: EconomyRecord): AdventGiftReceipt[] {
  return Object.values(wallet?.adventGifts ?? {})
    .filter((g) => !g.seenAt)
    .sort((a, b) => a.receivedAt.localeCompare(b.receivedAt) || a.id.localeCompare(b.id))
}

export function markAdventGiftsSeen(wallet: EconomyRecord, ids: string[], now = new Date()) {
  for (const id of ids) {
    const receipt = wallet.adventGifts?.[id]
    if (receipt && !receipt.seenAt) receipt.seenAt = now.toISOString()
  }
}
