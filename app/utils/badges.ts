// Badges på profilsiden. Udregnes i browseren ud fra alle godkendte stickers (og
// stjerner til Publikumsfavorit). Tre slags:
//  - trin: samme badge i flere niveauer (bronze → sølv → guld → platin → diamant)
//  - enkelt: opnået eller ej
//  - rekord: kun én (eller dem der satte stickeren op sammen) har den – kan mistes igen
import type { RatingSummary } from '~/composables/useRatings'

export type BadgeKind = 'tier' | 'single' | 'record'

export interface Badge {
  id: string
  emoji: string
  name: string
  /** Hvad skal man gøre */
  desc: string
  kind: BadgeKind
  earned: boolean
  /** Trin: opnået niveau (0 = intet) */
  level: number
  /** Trin: antal niveauer */
  levels: number
  /** Nuværende tal og næste mål – til "8/10" */
  value: number
  next?: number
}

/** Ring-farve pr. niveau: bronze, sølv, guld, platin, diamant */
export const TIER_COLORS = ['#c98a4b', '#b7c0cc', '#f2c230', '#7fd3e0', '#b48cff']
export const TIER_NAMES = ['Bronze', 'Sølv', 'Guld', 'Platin', 'Diamant']

function tier(id: string, emoji: string, name: string, unit: string, steps: number[], value: number): Badge {
  const level = steps.filter(s => value >= s).length
  const next = steps[level]
  return {
    id, emoji, name, kind: 'tier', earned: level > 0, level, levels: steps.length, value, next,
    desc: next ? `${next} ${unit}` : `${steps[steps.length - 1]} ${unit} – højeste niveau`,
  }
}

function single(id: string, emoji: string, name: string, desc: string, earned: boolean, value = earned ? 1 : 0): Badge {
  return { id, emoji, name, desc, kind: 'single', earned, level: earned ? 1 : 0, levels: 1, value }
}

function record(id: string, emoji: string, name: string, desc: string, earned: boolean): Badge {
  return { id, emoji, name, desc, kind: 'record', earned, level: earned ? 1 : 0, levels: 1, value: earned ? 1 : 0 }
}

const byFirst = (a: Sticker, b: Sticker) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id)
const hasName = (s: Sticker, name: string) => s.placedBy.some(n => sameName(n, name))

/** Stickeren der har rekorden (ved lighed: den der blev sat op først) */
function holder(all: Sticker[], value: (s: Sticker) => number) {
  return [...all].sort((a, b) => value(b) - value(a) || byFirst(a, b))[0]
}

/** Flest stjerner i snit → flest stemmer → sat op først */
export function crowdFavorite(all: Sticker[], ratings: Record<string, RatingSummary>) {
  return all
    .filter(s => (ratings[s.id]?.count ?? 0) > 0)
    .sort((a, b) => ratings[b.id]!.avg - ratings[a.id]!.avg || ratings[b.id]!.count - ratings[a.id]!.count || byFirst(a, b))[0]
}

export function badgesFor(name: string, all: Sticker[], ratings: Record<string, RatingSummary> = {}): Badge[] {
  const mine = all.filter(s => hasName(s, name))
  const cities = new Set(mine.map(s => `${s.countryCode}:${s.city}`)).size
  const countries = new Set(mine.map(s => s.countryCode)).size

  // Pioner: var med til at sætte den første sticker op i et land
  const firstInCountry = new Map<string, Sticker>()
  for (const s of [...all].sort(byFirst)) if (!firstInCountry.has(s.countryCode)) firstInCountry.set(s.countryCode, s)
  const pioneered = [...firstInCountry.values()].filter(s => hasName(s, name)).length

  const perDay = new Map<string, number>()
  for (const s of mine) perDay.set(s.date, (perDay.get(s.date) ?? 0) + 1)
  const season = (s: Sticker) => themeForDate(new Date(`${s.date}T12:00:00`))

  const farthest = holder(all, s => s.distanceKm)
  const north = holder(all, s => s.lat)
  const south = holder(all, s => -s.lat)
  const favorite = crowdFavorite(all, ratings)

  return [
    tier('stickers', '🎯', 'Sticker-jæger', 'stickers', [1, 5, 10, 25, 50], mine.length),
    tier('cities', '🏙️', 'Bybuster', 'byer', [5, 10, 15, 20, 25], cities),
    tier('countries', '✈️', 'Globetrotter', 'lande', [3, 5, 10, 15], countries),
    single('pioneer', '🌍', 'Pioner', 'Første sticker i et nyt land', pioneered > 0, pioneered),
    single('home', '🏠', 'Hjemmebane', 'En sticker i Danmark', mine.some(s => s.countryCode === 'DK')),
    single('far', '🛫', 'Langt hjemmefra', 'En sticker over 1.000 km fra Aalborg', mine.some(s => s.distanceKm > 1000)),
    single('world', '🚀', 'Ud i verden', 'En sticker over 5.000 km fra Aalborg', mine.some(s => s.distanceKm > 5000)),
    single('team', '👯', 'Holdspiller', 'Sæt en sticker op sammen med andre', mine.some(s => s.placedBy.length > 1)),
    single('turbo', '⚡', 'Turbo', '2 stickers på samme dag', [...perDay.values()].some(n => n >= 2)),
    single('halloween', '🎃', 'Halloween', 'En sticker i halloween-ugen', mine.some(s => season(s) === 'halloween')),
    single('jul', '🎄', 'Jul', 'En sticker i juletiden', mine.some(s => season(s) === 'jul')),
    record('farthest', '🧭', 'Længst væk', 'Har stickeren længst fra Aalborg', Boolean(farthest && hasName(farthest, name))),
    record('north', '❄️', 'Nordligst', 'Har den nordligste sticker', Boolean(north && hasName(north, name))),
    record('south', '🌴', 'Sydligst', 'Har den sydligste sticker', Boolean(south && hasName(south, name))),
    record('favorite', '⭐', 'Publikums­favorit', 'Har stickeren med flest stjerner', Boolean(favorite && hasName(favorite, name))),
  ]
}

export function earnedCount(badges: Badge[]) {
  return badges.filter(b => b.earned).length
}
