import type { EconomyRecord } from '../../shared/types/economy'
import type {
  ParcelAdminCampaign,
  ParcelGame,
  ParcelPhysicalWinner,
} from '../../shared/types/parcel-game'
import { isParcelPhysical } from '../../shared/utils/parcel-rewards'
import { parcelSchedule } from '../../shared/utils/parcel-game'

/** Reading admin never advances a game, draws prizes, changes owners or pays anything. */
export function parcelPhysicalWinners(
  game: ParcelGame,
  wallets: Record<string, EconomyRecord>,
): ParcelPhysicalWinner[] {
  if (!game.ended || game.cancelled || !game.prizesAssigned) return []
  return game.parcels.flatMap((parcel) => {
    if (!parcel.reward || !isParcelPhysical(parcel.reward)) return []
    const receipt = parcel.owner
      ? wallets[nameKey(parcel.owner)]?.parcelRewards?.[`parcel-open:${game.year}:${parcel.id}`]
      : undefined
    const openedAt = parcel.openedAt && receipt?.openedAt ? parcel.openedAt : null
    return [
      {
        id: `${game.year}:${parcel.id}`,
        year: game.year,
        parcelId: parcel.id,
        winner: parcel.owner,
        reward: parcel.reward,
        openedAt,
        deliveredAt: openedAt ? (receipt?.deliveredAt ?? null) : null,
      },
    ]
  })
}

export function parcelAdminCampaigns(
  games: Record<string, ParcelGame>,
  wallets: Record<string, EconomyRecord>,
  now = new Date(),
): ParcelAdminCampaign[] {
  return Object.values(games)
    .sort((a, b) => b.year - a.year)
    .map((game) => ({
      year: game.year,
      phase: game.cancelled
        ? 'cancelled'
        : game.ended
          ? 'ended'
          : now.getTime() >= Date.parse(game.startsAt)
            ? 'playing'
            : parcelSchedule(game.year, now).registrationOpen
              ? 'registration'
              : 'waiting',
      participants: game.players.length,
      physicalWinners: parcelPhysicalWinners(game, wallets),
    }))
}

export function setParcelPrizeDelivery(
  wallet: EconomyRecord,
  game: ParcelGame,
  id: string,
  delivered: boolean,
  now = new Date(),
) {
  if (!game.ended || game.cancelled)
    throw createError({ statusCode: 409, statusMessage: 'Pakkelegen er ikke afsluttet.' })
  const award = parcelPhysicalWinners(game, {}).find((entry) => entry.id === id)
  if (!award?.winner)
    throw createError({ statusCode: 404, statusMessage: 'Præmien har ingen vinder.' })
  const receipt = wallet.parcelRewards?.[`parcel-open:${game.year}:${award.parcelId}`]
  const parcel = game.parcels.find((p) => p.id === award.parcelId)!
  if (
    !parcel.openedAt ||
    !receipt?.openedAt ||
    receipt.year !== game.year ||
    receipt.parcelId !== award.parcelId ||
    receipt.reward.kind !== award.reward.kind
  )
    throw createError({ statusCode: 409, statusMessage: 'Vinderen skal åbne gaven først.' })
  if (delivered) receipt.deliveredAt ??= now.toISOString()
  else delete receipt.deliveredAt
}
