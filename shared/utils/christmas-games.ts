import type { ParcelView } from '../types/parcel-game'
import { adventPresentation } from './advent'
import { boxesSeason } from './boxes'
import { gameDay } from './game-day'

/** Preview cards count as available; January collection follows the actual game's deadline. */
export function christmasGames(now = new Date(), parcel?: ParcelView | null) {
  const month = new Intl.DateTimeFormat('en', {
    timeZone: 'Europe/Copenhagen',
    month: '2-digit',
  }).format(now)
  const previewSeason = (month === '11' && gameDay(now).slice(5) >= '11-01') || month === '12'
  const collection =
    parcel?.phase === 'ended' &&
    !parcel.cancelled &&
    !!parcel.collectionUntil &&
    now.getTime() < Date.parse(parcel.collectionUntil)
  const boxSeason = boxesSeason(now)
  const boxes = previewSeason && now.getTime() < Date.parse(boxSeason.endAt)
  const calendar = adventPresentation(now)
  const parcels = (previewSeason && parcel?.phase !== 'archived') || collection
  return {
    visible: boxes || calendar.visible || parcels,
    boxes,
    boxesOpen: boxSeason.active,
    parcels,
    calendar: calendar.visible,
    calendarOpen: calendar.open,
  }
}
