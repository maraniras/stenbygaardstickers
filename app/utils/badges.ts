// Badges på profilsiden. Udregnes i browseren ud fra alle godkendte stickers (og
// stjerner). Tre slags:
//  - trin: samme badge i flere niveauer med eget navn pr. niveau
//    (ringen går bronze → sølv → guld → platin → diamant)
//  - enkelt: opnået eller ej
//  - rekord: kun én (eller dem der satte stickeren op sammen) har den – kan mistes
//    igen. "Årets flittigste" låses, når året er slut.
import type { RatingSummary } from '~/composables/useRatings'

export type BadgeKind = 'tier' | 'single' | 'record'

export interface Badge {
  id: string
  emoji: string
  /** Nuværende navn – for trin navnet på det opnåede niveau (eller første niveau) */
  name: string
  /** Hvad skal man gøre (til ikke opnåede) */
  desc: string
  kind: BadgeKind
  earned: boolean
  /** Trin: opnået niveau (0 = intet) */
  level: number
  levels: number
  /** Nuværende tal og næste mål – til "3/5" */
  value: number
  next?: number
  /** Trin: navnet på næste niveau */
  nextName?: string
  /** Rekord der ikke kan mistes mere (fx et afsluttet år) */
  final?: boolean
}

/** Ring-farve pr. niveau: bronze, sølv, guld, platin, diamant */
export const TIER_COLORS = ['#c98a4b', '#b7c0cc', '#f2c230', '#7fd3e0', '#b48cff']

function tier(id: string, emoji: string, names: string[], unit: string, steps: number[], value: number, suffix = ''): Badge {
  const level = steps.filter(s => value >= s).length
  const next = steps[level]
  return {
    id, emoji, kind: 'tier', earned: level > 0, level, levels: steps.length, value, next,
    name: `${names[Math.max(0, level - 1)]}${level ? suffix : ''}`,
    nextName: next ? names[level] : undefined,
    desc: `${steps[0]} ${unit}`,
  }
}

function single(id: string, emoji: string, name: string, desc: string, earned: boolean, value = earned ? 1 : 0): Badge {
  return { id, emoji, name, desc, kind: 'single', earned, level: earned ? 1 : 0, levels: 1, value }
}

function record(id: string, emoji: string, name: string, desc: string, earned: boolean, final = false): Badge {
  return { id, emoji, name, desc, kind: 'record', earned, level: earned ? 1 : 0, levels: 1, value: earned ? 1 : 0, final }
}

const byFirst = (a: Sticker, b: Sticker) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id)
const hasName = (s: Sticker, name: string) => s.placedBy.some(n => sameName(n, name))
const day = (s: Sticker) => new Date(`${s.date}T12:00:00`)
const DAY_MS = 24 * 60 * 60 * 1000

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

/** Den der satte flest stickers op i et år. Ved lighed: den der nåede antallet først. */
export function yearWinners(all: Sticker[], year: number) {
  const inYear = all.filter(s => s.date.startsWith(`${year}-`)).sort(byFirst)
  const counts = new Map<string, { name: string, count: number, reachedAt: string }>()
  for (const s of inYear) {
    for (const n of s.placedBy) {
      const key = [...counts.keys()].find(k => sameName(k, n)) ?? n
      const c = counts.get(key) ?? { name: key, count: 0, reachedAt: '' }
      c.count++
      c.reachedAt = s.date
      counts.set(key, c)
    }
  }
  const best = [...counts.values()].sort((a, b) => b.count - a.count || a.reachedAt.localeCompare(b.reachedAt))[0]
  if (!best) return []
  // Fik flere samme antal samme dag, deler de rekorden
  return [...counts.values()].filter(c => c.count === best.count && c.reachedAt === best.reachedAt).map(c => c.name)
}

const FIRST_YEAR = 2026

const CONTINENT_BADGES: { id: Continent, emoji: string, names: string[] }[] = [
  { id: 'europa', emoji: '🏰', names: ['Interrail-turist', 'Euro-Emil', 'Europa-ekspert', 'Europamester', 'Europas konge'] },
  { id: 'afrika', emoji: '🦁', names: ['Afrika-turist', 'Safari', 'Savannekender', 'Løvetæmmer', 'Løvernes konge'] },
  { id: 'asien', emoji: '🏯', names: ['Backpacker', 'Rickshaw-rytter', 'Østens Emil', 'Shogun', 'Dragekejser'] },
  { id: 'nordamerika', emoji: '🗽', names: ['Amerika-turist', 'Road trip', 'American Dream', 'Cowboy', 'Mr. President'] },
  { id: 'sydamerika', emoji: '🦜', names: ['Sydamerika-turist', 'Samba-Emil', 'Gaucho', 'Amazonas-ekspert', 'Inka-kongen'] },
  { id: 'oceanien', emoji: '🦘', names: ['Down Under', 'Kænguru-ven', 'Surfer', 'Crocodile Emil', 'Kænguru-kongen'] },
]
const CONTINENT_NAMES: Record<Continent, string> = {
  europa: 'Europa', afrika: 'Afrika', asien: 'Asien', nordamerika: 'Nordamerika', sydamerika: 'Sydamerika', oceanien: 'Australien/Oceanien',
}

export function badgesFor(name: string, all: Sticker[], ratings: Record<string, RatingSummary> = {}, now = new Date()): Badge[] {
  const mine = all.filter(s => hasName(s, name)).sort(byFirst)
  const cityCounts = new Map<string, number>()
  for (const s of mine) cityCounts.set(`${s.countryCode}:${s.city}`, (cityCounts.get(`${s.countryCode}:${s.city}`) ?? 0) + 1)
  const countries = new Set(mine.map(s => s.countryCode)).size
  const dkCities = new Set(mine.filter(s => s.countryCode === 'DK').map(s => s.city)).size

  // Kontinenter
  const perContinent = new Map<Continent, number>()
  for (const s of mine) {
    const c = continentOf(s.countryCode)
    if (c) perContinent.set(c, (perContinent.get(c) ?? 0) + 1)
  }

  // Makker: den person man har sat flest op sammen med
  const partners = new Map<string, number>()
  for (const s of mine) {
    for (const n of s.placedBy) {
      if (sameName(n, name)) continue
      const key = [...partners.keys()].find(k => sameName(k, n)) ?? n
      partners.set(key, (partners.get(key) ?? 0) + 1)
    }
  }
  const [partner, partnerCount] = [...partners].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'da'))[0] ?? ['', 0]

  // Pioner: var med til at sætte den første sticker op i et land
  const firstInCountry = new Map<string, Sticker>()
  for (const s of [...all].sort(byFirst)) if (!firstInCountry.has(s.countryCode)) firstInCountry.set(s.countryCode, s)
  const pioneered = [...firstInCountry.values()].filter(s => hasName(s, name)).length

  const perDay = new Map<string, number>()
  for (const s of mine) perDay.set(s.date, (perDay.get(s.date) ?? 0) + 1)
  const season = (s: Sticker) => themeForDate(day(s))
  const month = (s: Sticker) => day(s).getMonth() + 1

  // Grænsehopper: to forskellige lande inden for 7 dage
  const borderHop = mine.some((a, i) => mine.slice(i + 1).some(b =>
    a.countryCode !== b.countryCode && Math.abs(day(a).getTime() - day(b).getTime()) <= 7 * DAY_MS))

  // Stime: stickers 3 måneder i træk
  const months = [...new Set(mine.map(s => { const d = day(s); return d.getFullYear() * 12 + d.getMonth() }))].sort((a, b) => a - b)
  const streak = months.some((m, i) => months[i + 1] === m + 1 && months[i + 2] === m + 2)

  const originals = [...all].sort(byFirst).slice(0, 5)
  const farthest = holder(all, s => s.distanceKm)
  const north = holder(all, s => s.lat)
  const south = holder(all, s => -s.lat)
  const favorite = crowdFavorite(all, ratings)

  const years: number[] = []
  for (let y = FIRST_YEAR; y <= now.getFullYear(); y++) years.push(y)

  return [
    tier('stickers', '🎯', ['Første klister', 'Klistrelus', 'Sticker-jæger', 'Sticker-mester', 'Sticker-legende'], 'sticker', [1, 5, 10, 25, 50], mine.length),
    tier('cities', '🏙️', ['Byturist', 'Bybuster', 'Storbymenneske', 'Metropol-mester', 'Byernes konge'], 'byer', [5, 10, 15, 20, 25], cityCounts.size),
    tier('countries', '✈️', ['Grænsekrydser', 'Eventyrer', 'Globetrotter', 'Verdensborger'], 'lande', [3, 5, 10, 15], countries),
    tier('partner', '🤝', ['Makkere', 'Venner', 'BFF', 'Partners in Crime', 'Dynamisk Duo'], 'stickers med samme person', [2, 3, 5, 10, 15], partnerCount, partner ? ` med ${partner}` : ''),
    tier('continents', '🌐', ['Interkontinental', 'Verdensfarer', 'Jordomrejsende', 'Kosmopolit', 'Hele kloden'], 'kontinenter', [2, 3, 4, 5, 6], perContinent.size),
    ...CONTINENT_BADGES.map(c => tier(`continent-${c.id}`, c.emoji, c.names, `sticker i ${CONTINENT_NAMES[c.id]}`, [1, 3, 5, 10, 15], perContinent.get(c.id) ?? 0)),

    single('pioneer', '🌍', 'Pioner', 'Første sticker i et nyt land', pioneered > 0, pioneered),
    single('original', '⏳', 'Original', 'Var med til en af de 5 første stickers', originals.some(s => hasName(s, name))),
    single('home', '🏠', 'Hjemmebane', 'En sticker i Danmark', mine.some(s => s.countryCode === 'DK')),
    single('denmark', '🇩🇰', 'Rundt i Danmark', '5 forskellige danske byer', dkCities >= 5),
    single('regular', '🔁', 'Stamkunde', '2 stickers i samme by', [...cityCounts.values()].some(n => n >= 2)),
    single('far', '🛫', 'Langt hjemmefra', 'En sticker over 1.000 km fra Aalborg', mine.some(s => s.distanceKm > 1000)),
    single('world', '🚀', 'Ud i verden', 'En sticker over 5.000 km fra Aalborg', mine.some(s => s.distanceKm > 5000)),
    single('border', '🚂', 'Grænsehopper', '2 lande inden for 7 dage', borderHop),
    single('team', '👯', 'Holdspiller', 'Sæt en sticker op sammen med andre', mine.some(s => s.placedBy.length > 1)),
    single('turbo', '⚡', 'Turbo', '2 stickers på samme dag', [...perDay.values()].some(n => n >= 2)),
    single('weekend', '📆', 'Weekendkriger', '5 stickers i weekender', mine.filter(s => [0, 6].includes(day(s).getDay())).length >= 5),
    single('streak', '🔥', 'Stime', 'Stickers 3 måneder i træk', streak),
    single('spring', '🌷', 'Forår', 'En sticker i marts–maj', mine.some(s => [3, 4, 5].includes(month(s)))),
    single('summer', '☀️', 'Sommer', 'En sticker i juni–august', mine.some(s => [6, 7, 8].includes(month(s)))),
    single('autumn', '🍂', 'Efterår', 'En sticker i september–november', mine.some(s => [9, 10, 11].includes(month(s)))),
    single('winter', '❄️', 'Vinter', 'En sticker i december–februar', mine.some(s => [12, 1, 2].includes(month(s)))),
    single('halloween', '🎃', 'Halloween', 'En sticker i halloween-ugen', mine.some(s => season(s) === 'halloween')),
    single('jul', '🎄', 'Jul', 'En sticker i juletiden', mine.some(s => season(s) === 'jul')),
    single('newyear', '🎆', 'Nytår', 'En sticker 31. december eller 1. januar', mine.some(s => s.date.endsWith('-12-31') || s.date.endsWith('-01-01'))),
    single('director', '🎬', 'Instruktør', 'En sticker med video', mine.some(s => s.media.some(m => m.type === 'video'))),
    single('photographer', '📸', 'Fotograf', 'En sticker med 3+ billeder/videoer', mine.some(s => s.media.length >= 3)),
    single('magnet', '🧲', 'Magnet', 'En sticker med mindst 5 stemmer', mine.some(s => (ratings[s.id]?.count ?? 0) >= 5)),
    single('stardust', '🌟', 'Stjernestøv', 'En sticker med 4,5+ stjerner og flere end 3 stemmer',
      mine.some(s => (ratings[s.id]?.count ?? 0) > 3 && (ratings[s.id]?.avg ?? 0) >= 4.5)),

    record('farthest', '🧭', 'Længst væk', 'Har stickeren længst fra Aalborg', Boolean(farthest && hasName(farthest, name))),
    record('north', '❄️', 'Nordligst', 'Har den nordligste sticker', Boolean(north && hasName(north, name))),
    record('south', '🌴', 'Sydligst', 'Har den sydligste sticker', Boolean(south && hasName(south, name))),
    record('favorite', '⭐', 'Publikums­favorit', 'Har stickeren med flest stjerner', Boolean(favorite && hasName(favorite, name))),
    ...years.map(y => record(`year-${y}`, '🏆', `Årets flittigste ${y}`, `Flest stickers i ${y}`,
      yearWinners(all, y).some(n => sameName(n, name)), y < now.getFullYear())),
  ]
}

export function earnedCount(badges: Badge[]) {
  return badges.filter(b => b.earned).length
}
