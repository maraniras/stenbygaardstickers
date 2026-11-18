import { christmasGames } from '../../shared/utils/christmas-games'
import { parcelSchedule } from '../../shared/utils/parcel-game'
import { gameDay } from '../../shared/utils/game-day'

/** Discovery follows real availability, never previews or merely visiting the games menu. */
export function christmasDiscoveries(now: Date) {
  const season = christmasGames(now)
  const year = Number(gameDay(now).slice(0, 4))
  const dates = parcelSchedule(year, now)
  const items: { key: string; path: string }[] = []
  if (season.boxesOpen) items.push({ key: `${year}:boxes`, path: '/spil/bokse' })
  if (season.parcels && dates.registrationOpen)
    items.push({ key: `${year}:parcel-registration`, path: '/spil/pakkeleg' })
  if (season.parcels && now.getTime() >= Date.parse(dates.startsAt))
    items.push({ key: `${year}:parcel-playing`, path: '/spil/pakkeleg' })
  if (season.calendarOpen) items.push({ key: `${year}:calendar`, path: '/spil/julekalender' })
  return items
}
