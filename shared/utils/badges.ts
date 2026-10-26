// Badges på profilsiden. Udregnes ud fra alle godkendte stickers (og 👍 og kommentarer) – i
// browseren og på serveren, som sender besked om nye badges (server/utils/badge-push.ts).
// Tre slags:
//  - trin: samme badge i flere niveauer med eget navn pr. niveau
//    (ringen går bronze → sølv → guld → platin → diamant)
//  - enkelt: opnået eller ej
//  - rekord: kun én (eller dem der satte stickeren op sammen) har den – kan mistes
//    igen. "Årets Dengse" låses, når året er slut.
// Med { history: true } afspilles personens stickers i datoorden for at finde, hvornår
// (og med hvilken sticker) hver badge og hvert trin blev opnået – til badge-modalen.

export type BadgeKind = 'tier' | 'single' | 'record'

export interface BadgeStep {
  at: number
  name: string
  /** Fx "5 stickers" */
  label: string
  /** Dato trinnet blev nået (kun med history) */
  reachedAt?: string
  /** Point for trinnet */
  points?: number
}

export interface Badge {
  id: string
  emoji: string
  /** Nuværende navn – for trin navnet på det opnåede niveau (eller første niveau) */
  name: string
  /** Hvad skal man gøre */
  desc: string
  /** Trin: forklaring af hvad der tælles */
  about?: string
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
  /** Trin: alle niveauer */
  steps?: BadgeStep[]
  /** Enkelt: fremskridt hvor det giver mening, fx 2 af 5 danske byer */
  progress?: { value: number, target: number }
  /** Rekord der ikke kan mistes mere (fx et afsluttet år) */
  final?: boolean
  /** Rekord: hvem har den lige nu */
  holders?: string[]
  /** Pioner: antal lande man var først i */
  count?: number
  /** Point man har fået for badgen (trin: summen af de nåede trin) */
  points: number
  /** Point badgen giver – trin: næste trin, Pioner: pr. land, rekord: når den er officiel */
  worth: number
  /** Landekode – vises som flag-billede i stedet for emoji (Windows kan ikke vise flag-emojis) */
  flag?: string
  /** Hvornår den blev opnået, og med hvilken sticker (kun med history) */
  earnedAt?: string
  earnedWith?: { id: string, title: string }
}

/** Ring-farve pr. niveau: bronze, sølv, guld, platin, diamant */
export const TIER_COLORS = ['#c98a4b', '#b7c0cc', '#f2c230', '#7fd3e0', '#b48cff']

/** Enhed i ental/flertal: unit("sticker", "stickers")(5) → "5 stickers" */
const unit = (one: string, many: string) => (n: number) => `${n} ${n === 1 ? one : many}`

function tier(id: string, emoji: string, names: string[], label: (n: number) => string, steps: number[], value: number, about: string, suffix = ''): Badge {
  const level = steps.filter(s => value >= s).length
  const next = steps[level]
  return {
    id, emoji, kind: 'tier', earned: level > 0, level, levels: steps.length, value, next, about, points: 0, worth: 0,
    name: `${names[Math.max(0, level - 1)]}${level ? suffix : ''}`,
    nextName: next ? names[level] : undefined,
    desc: label(steps[0]!),
    steps: steps.map((at, i) => ({ at, name: names[i]!, label: label(at) })),
  }
}

function single(id: string, emoji: string, name: string, desc: string, earned: boolean, progress?: { value: number, target: number }): Badge {
  return { id, emoji, name, desc, kind: 'single', earned, level: earned ? 1 : 0, levels: 1, value: earned ? 1 : 0, progress, points: 0, worth: 0 }
}

function record(id: string, emoji: string, name: string, desc: string, earned: boolean, holders: string[], final = false): Badge {
  return { id, emoji, name, desc, kind: 'record', earned, level: earned ? 1 : 0, levels: 1, value: earned ? 1 : 0, holders, final, points: 0, worth: 0 }
}

const byFirst = (a: Sticker, b: Sticker) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id)
const hasName = (s: Sticker, name: string) => s.placedBy.some(n => sameName(n, name))
const day = (s: Sticker) => new Date(`${s.date}T12:00:00`)
const DAY_MS = 24 * 60 * 60 * 1000
const maxOf = (values: Iterable<number>) => Math.max(0, ...values)

/** Stickeren der har rekorden (ved lighed: den der blev sat op først) */
function holder(all: Sticker[], value: (s: Sticker) => number) {
  return [...all].sort((a, b) => value(b) - value(a) || byFirst(a, b))[0]
}

/** Flest 👍 i snit → flest stemmer → sat op først */
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
  if (!best) return { names: [] as string[], reachedAt: '' }
  // Fik flere samme antal samme dag, deler de rekorden
  return {
    names: [...counts.values()].filter(c => c.count === best.count && c.reachedAt === best.reachedAt).map(c => c.name),
    reachedAt: best.reachedAt,
  }
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

/** Udregner alle badges ud fra personens stickers (mine – evt. kun de første) */
const NO_COMMENTS: CommentStats = { comments: 0, tagged: 0, likes: 0, maxLikes: 0 }
/** Badges der kommer fra kommentarer – de har ikke en sticker eller dato */
const COMMENT_BADGES = new Set(['commenter', 'tagged', 'likes', 'hit', 'viral'])

function compute(name: string, mine: Sticker[], all: Sticker[], ratings: Record<string, RatingSummary>, now: Date, cs: CommentStats): Badge[] {
  const mineIds = new Set(mine.map(s => s.id))
  const inMine = (s?: Sticker) => Boolean(s && mineIds.has(s.id))

  const cityCounts = new Map<string, number>()
  for (const s of mine) cityCounts.set(`${s.countryCode}:${s.city}`, (cityCounts.get(`${s.countryCode}:${s.city}`) ?? 0) + 1)
  const countries = new Set(mine.map(s => s.countryCode)).size
  const dkCities = new Set(mine.filter(s => s.countryCode === 'DK').map(s => s.city)).size

  // Kontinenter. Til kontinent-badgene tæller Danmark ikke som Europa (det skal være
  // en rejse), men Kontinent-kryds tæller alle kontinenter man har været på.
  const continentsVisited = new Set<Continent>()
  const perContinent = new Map<Continent, number>()
  for (const s of mine) {
    const c = continentOf(s.countryCode)
    if (!c) continue
    continentsVisited.add(c)
    if (s.countryCode !== 'DK') perContinent.set(c, (perContinent.get(c) ?? 0) + 1)
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
  const ordered = [...all].sort(byFirst)
  const firstInCountry = new Map<string, Sticker>()
  for (const s of ordered) if (!firstInCountry.has(s.countryCode)) firstInCountry.set(s.countryCode, s)
  const pioneered = [...firstInCountry.values()].filter(inMine).length

  const perDay = new Map<string, number>()
  for (const s of mine) perDay.set(s.date, (perDay.get(s.date) ?? 0) + 1)
  const season = (s: Sticker) => themeForDate(day(s))
  const month = (s: Sticker) => day(s).getMonth() + 1

  // Grænsehopper: to forskellige lande inden for 7 dage
  const borderHop = mine.some((a, i) => mine.slice(i + 1).some(b =>
    a.countryCode !== b.countryCode && Math.abs(day(a).getTime() - day(b).getTime()) <= 7 * DAY_MS))

  const capitals = new Set(mine.map(capitalOf).filter(Boolean)).size
  const visitedOf = (codes: string[]) => codes.filter(c => mine.some(s => s.countryCode === c)).length

  // Roadtrip: flest forskellige byer inden for 14 dage (mine er sorteret efter dato)
  const roadtripCities = maxOf(mine.map((a, i) => new Set(mine.slice(i)
    .filter(b => day(b).getTime() - day(a).getTime() <= 14 * DAY_MS)
    .map(b => `${b.countryCode}:${b.city}`)).size))
  // Langtur: to af ens stickers over 5.000 km fra hinanden
  const longHaul = mine.some((a, i) => mine.slice(i + 1).some(b => distanceKm(a, b) > 5000))
  // Comeback: en ny sticker efter over et halvt års pause
  const comeback = mine.some((s, i) => i > 0 && day(s).getTime() - day(mine[i - 1]!).getTime() > 182 * DAY_MS)

  const jubilees = [10, 25, 50, 75, 100]
  const votes = mine.reduce((sum, s) => sum + (ratings[s.id]?.count ?? 0), 0)
  const videos = mine.filter(s => s.media.some(m => m.type === 'video')).length
  const weekend = mine.filter(s => [0, 6].includes(day(s).getDay())).length

  // Stime: stickers 3 måneder i træk
  const months = [...new Set(mine.map(s => { const d = day(s); return d.getFullYear() * 12 + d.getMonth() }))].sort((a, b) => a - b)
  const streak = months.some((m, i) => months[i + 1] === m + 1 && months[i + 2] === m + 2)

  const farthest = holder(all, s => s.distanceKm)
  const north = holder(all, s => s.lat)
  const south = holder(all, s => -s.lat)
  const favorite = crowdFavorite(all, ratings)

  const years: number[] = []
  for (let y = FIRST_YEAR; y <= now.getFullYear(); y++) years.push(y)

  return [
    tier('stickers', '🎯', ['Første klister', 'Klistrelus', 'Klistrefnat', 'Sticker-mester', 'Sticker-legende'], unit('sticker', 'stickers'), [1, 5, 10, 25, 50], mine.length,
      'Antal stickers man har været med til at sætte op.'),
    tier('cities', '🏙️', ['Byturist', 'Bybuster', 'Storbymenneske', 'Metropol-mester', 'Byernes konge'], unit('by', 'byer'), [5, 10, 15, 20, 25], cityCounts.size,
      'Antal forskellige byer med en sticker.'),
    tier('countries', '✈️', ['Grænsekrydser', 'Eventyrer', 'Globetrotter', 'Verdensborger'], unit('land', 'lande'), [3, 5, 10, 15], countries,
      'Antal forskellige lande med en sticker.'),
    tier('partner', '🤝', ['Makker', 'Venner', 'BFF', 'Dynamisk Duo', 'Sindssyg Ægte venner'], unit('sticker med samme person', 'stickers med samme person'), [2, 3, 5, 10, 15], partnerCount,
      'Stickers sat op sammen med den samme person – den man har flest med.', partner ? ` med ${partner}` : ''),
    tier('network', '🕸️', ['Social', 'Netværker', 'Samlingspunkt', 'Kendt af alle'], unit('makker', 'forskellige makkere'), [2, 3, 5, 10], partners.size,
      'Antal forskellige personer man har sat stickers op sammen med.'),
    tier('capitals', '🏛️', ['Hovedstads-turist', 'Hovedstadsjæger', 'Diplomat', 'Verdensambassadør'], unit('hovedstad', 'hovedstæder'), [1, 3, 5, 10], capitals,
      'Antal hovedstæder med en sticker (inden for 25 km af centrum).'),
    tier('continents', '🌐', ['Interkontinental', 'Verdensfarer', 'Jordomrejsende', 'Kosmopolit', 'Hele kloden'], unit('kontinent', 'kontinenter'), [2, 3, 4, 5, 6], continentsVisited.size,
      'Antal forskellige kontinenter med en sticker.'),
    ...CONTINENT_BADGES.map(c => tier(`continent-${c.id}`, c.emoji, c.names, unit(`sticker i ${CONTINENT_NAMES[c.id]}`, `stickers i ${CONTINENT_NAMES[c.id]}`), [1, 3, 5, 10, 15], perContinent.get(c.id) ?? 0,
      c.id === 'europa' ? 'Antal stickers i Europa – Danmark tæller ikke med.' : `Antal stickers i ${CONTINENT_NAMES[c.id]}.`)),

    { ...single('pioneer', '🌍', 'Pioner', 'Første sticker nogensinde i et nyt land – giver point for hvert land', pioneered > 0), count: pioneered },
    single('original', '⏳', 'Ægte', 'Var med til en af de 5 første stickers', ordered.slice(0, 5).some(inMine)),
    single('home', '🏠', 'Hjemmebane', 'En sticker i Danmark', mine.some(s => s.countryCode === 'DK')),
    { ...single('denmark', '🇩🇰', 'Rundt i Danmark', '5 forskellige danske byer', dkCities >= 5, { value: dkCities, target: 5 }), flag: 'DK' },
    single('neighbour', '🏡', 'En ægte nabo', 'En sticker i både Sverige, Norge og Tyskland', visitedOf(['SE', 'NO', 'DE']) === 3,
      { value: visitedOf(['SE', 'NO', 'DE']), target: 3 }),
    single('nordic', '🌲', 'Nordisk mester', 'Danmark, Sverige, Norge, Finland og Island', visitedOf(['DK', 'SE', 'NO', 'FI', 'IS']) === 5,
      { value: visitedOf(['DK', 'SE', 'NO', 'FI', 'IS']), target: 5 }),
    single('arctic', '🐻‍❄️', 'Pisse koldt', 'En sticker nord for polarcirklen', mine.some(s => s.lat > 66.5634)),
    single('equator', '🌏', 'Fucking varmt', 'En sticker syd for ækvator', mine.some(s => s.lat < 0)),
    single('roadtrip', '🛣️', 'Roadtrip', '3 forskellige byer inden for 2 uger', roadtripCities >= 3, { value: roadtripCities, target: 3 }),
    single('longhaul', '🧳', 'Langtur', 'To stickers over 5.000 km fra hinanden', longHaul),
    single('comeback', '🔄', 'Comeback', 'En ny sticker efter over et halvt års pause', comeback),
    single('birthday', '🎂', 'Emils fødselsdag', 'En sticker den 27. juli', mine.some(s => s.date.endsWith('-07-27'))),
    single('gang', '👨‍👩‍👧‍👦', 'Hele banden', 'En sticker sat op af 4 eller flere', mine.some(s => s.placedBy.length >= 4),
      { value: maxOf(mine.map(s => s.placedBy.length)), target: 4 }),
    single('regular', '🔁', 'Stamkunde', '2 stickers i samme by', maxOf(cityCounts.values()) >= 2, { value: maxOf(cityCounts.values()), target: 2 }),
    single('far', '🛫', 'Langt hjemmefra', 'En sticker over 1.000 km fra Aalborg', mine.some(s => s.distanceKm > 1000)),
    single('world', '🚀', 'Ud i verden', 'En sticker over 5.000 km fra Aalborg', mine.some(s => s.distanceKm > 5000)),
    single('border', '🚂', 'Grænsehopper', '2 lande inden for 7 dage', borderHop),
    single('team', '👯', 'Holdspiller', 'Sæt en sticker op sammen med andre', mine.some(s => s.placedBy.length > 1)),
    single('turbo', '⚡', 'Turbo', '2 stickers på samme dag', maxOf(perDay.values()) >= 2, { value: maxOf(perDay.values()), target: 2 }),
    single('weekend', '📆', 'Weekendkriger', '5 stickers i weekender', weekend >= 5, { value: weekend, target: 5 }),
    single('streak', '🔥', 'Stime', 'Stickers 3 måneder i træk', streak),
    single('spring', '🌷', 'Forår', 'En sticker i marts–maj', mine.some(s => [3, 4, 5].includes(month(s)))),
    single('summer', '☀️', 'Sommer', 'En sticker i juni–august', mine.some(s => [6, 7, 8].includes(month(s)))),
    single('autumn', '🍂', 'Efterår', 'En sticker i september–november', mine.some(s => [9, 10, 11].includes(month(s)))),
    single('winter', '❄️', 'Vinter', 'En sticker i december–februar', mine.some(s => [12, 1, 2].includes(month(s)))),
    single('paaske', '🐣', 'Påske', 'En sticker i påsken (onsdag før palmesøndag – tirsdag efter 2. påskedag)', mine.some(s => season(s) === 'paaske')),
    single('halloween', '🎃', 'Halloween', 'En sticker i halloween-ugen (26/10–1/11)', mine.some(s => season(s) === 'halloween')),
    single('jul', '🎄', 'Jul', 'En sticker i juletiden (20/11–31/12)', mine.some(s => season(s) === 'jul')),
    single('newyear', '🎆', 'Nytår', 'En sticker 31. december eller 1. januar', mine.some(s => s.date.endsWith('-12-31') || s.date.endsWith('-01-01'))),
    single('director', '🎬', 'Instruktør', 'En sticker med video', videos >= 1),
    single('filmstar', '🎥', 'Filmstjerne', '3 stickers med video', videos >= 3, { value: videos, target: 3 }),
    single('live', '🔴', 'Er vi live?', '5 stickers med video', videos >= 5, { value: videos, target: 5 }),
    single('author', '✍️', 'Forfatter', 'En beskrivelse på over 300 tegn', mine.some(s => s.description.length > 300)),
    single('photographer', '📸', 'Fotograf', 'En sticker med 3+ billeder/videoer', mine.some(s => s.media.length >= 3),
      { value: maxOf(mine.map(s => s.media.length)), target: 3 }),
    single('magnet', '🧲', 'Magnet', 'En sticker med mindst 5 stemmer', mine.some(s => (ratings[s.id]?.count ?? 0) >= 5),
      { value: maxOf(mine.map(s => ratings[s.id]?.count ?? 0)), target: 5 }),
    single('stardust', '🗼', 'Tommel-tårn', 'En sticker med 4,5+ 👍 i snit og flere end 3 stemmer',
      mine.some(s => (ratings[s.id]?.count ?? 0) > 3 && (ratings[s.id]?.avg ?? 0) >= 4.5)),
    single('fivestar', '🖐️', 'Fuld hånd', 'En sticker med 5,0 👍 i snit og mindst 3 stemmer',
      mine.some(s => (ratings[s.id]?.count ?? 0) >= 3 && (ratings[s.id]?.avg ?? 0) >= 4.999)),
    single('peoples', '🗳️', 'Folkets valg', 'Mindst 20 stemmer i alt på ens stickers', votes >= 20, { value: votes, target: 20 }),
    single('commenter', '💬', 'Første kommentar', 'Skriv en kommentar på en sticker', cs.comments >= 1),
    single('tagged', '🏷️', 'Tagget', 'Bliv tagget i en kommentar', cs.tagged >= 1),
    tier('likes', '👍', ['Liket', 'Populær', 'Folkets stemme', 'Influencer', 'Kultstatus'], unit('👍 på kommentarer', '👍 på kommentarer'), [1, 5, 10, 25, 50], cs.likes,
      '👍 i alt på dine kommentarer.'),
    single('hit', '💥', 'Hit', '5 👍 på én kommentar', cs.maxLikes >= 5, { value: cs.maxLikes, target: 5 }),
    single('viral', '📣', 'Viral', '10 👍 på én kommentar', cs.maxLikes >= 10, { value: cs.maxLikes, target: 10 }),
    ...jubilees.map(n => single(`jubilee-${n}`, '🎉', `Jubilar #${n}`, `Satte appens sticker nr. ${n} op`, inMine(ordered[n - 1]))),

    record('farthest', '🧭', 'Længst væk', 'Har stickeren længst fra Aalborg', inMine(farthest), farthest?.placedBy ?? []),
    record('north', '❄️', 'Nordligst', 'Har den nordligste sticker', inMine(north), north?.placedBy ?? []),
    record('south', '🌴', 'Sydligst', 'Har den sydligste sticker', inMine(south), south?.placedBy ?? []),
    record('favorite', '⭐', 'Publikums­favorit', 'Har stickeren med flest 👍 i snit (ved lighed flest stemmer, så først sat op)',
      inMine(favorite), favorite?.placedBy ?? []),
    ...years.map((y) => {
      const w = yearWinners(all, y)
      return record(`year-${y}`, '🏆', `Årets Dengse ${y}`, `Flest stickers i ${y} – ved lighed den der nåede antallet først`,
        w.names.some(n => sameName(n, name)), w.names, y < now.getFullYear())
    }),
  ]
}

export function badgesFor(
  name: string,
  all: Sticker[],
  ratings: Record<string, RatingSummary> = {},
  opts: { now?: Date, history?: boolean, comments?: Record<string, CommentStats> } = {},
): Badge[] {
  const now = opts.now ?? new Date()
  const mine = all.filter(s => hasName(s, name)).sort(byFirst)
  const cs = opts.comments?.[name.toLocaleLowerCase('da')] ?? NO_COMMENTS
  const badges = compute(name, mine, all, ratings, now, cs)
  if (!opts.history) return score(badges)

  // Afspil stickers i datoorden: første gang en badge (eller et trin) er opnået,
  // er det den sticker, der udløste den.
  const byId = new Map(badges.map(b => [b.id, b]))
  for (let k = 1; k <= mine.length; k++) {
    const s = mine[k - 1]!
    for (const b of compute(name, mine.slice(0, k), all, ratings, now, cs)) {
      const full = byId.get(b.id)
      if (!full) continue
      if (b.earned && !full.earnedAt) {
        full.earnedAt = s.date
        full.earnedWith = { id: s.id, title: s.title }
      }
      full.steps?.forEach((step, i) => {
        if (!step.reachedAt && b.level > i) step.reachedAt = s.date
      })
    }
  }
  // Kommentar-badges hører ikke til en sticker
  for (const b of badges) {
    if (!COMMENT_BADGES.has(b.id)) continue
    b.earnedAt = undefined
    b.earnedWith = undefined
    b.steps?.forEach((s) => { s.reachedAt = undefined })
  }
  // Årets Dengse: datoen man nåede det vindende antal
  for (const b of badges) {
    if (b.id.startsWith('year-') && b.earned) {
      b.earnedAt = yearWinners(all, Number(b.id.slice(5))).reachedAt
      b.earnedWith = undefined
    }
  }
  return score(badges)
}

/** Nøgler for alt opnået – ét pr. trin ("cities:2"), ellers badge-id'et. Bruges til at
 *  finde nye badges (notifikationer og "ny badge"-pop-up'en). */
export function earnedKeys(badges: Badge[]) {
  return badges.flatMap((b) => {
    if (!b.earned) return []
    if (b.kind === 'tier') return Array.from({ length: b.level }, (_, i) => `${b.id}:${i + 1}`)
    return [b.id]
  })
}

/** Badge-id'et i en nøgle */
export const badgeIdOf = (key: string) => key.split(':')[0]!

export function earnedCount(badges: Badge[]) {
  return badges.filter(b => b.earned).length
}

// ── Point og levels ─────────────────────────────────────────────────────────
// Rejser giver flest point – de fleste rejser ikke så meget. Rekorder giver først
// point, når de er officielle (Årets Dengse, når året er slut).

/** Point pr. trin */
const TIER_POINTS: Record<string, number[]> = {
  'stickers': [1, 2, 4, 8, 16],
  'cities': [2, 4, 8, 12, 16],
  'countries': [3, 6, 12, 20],
  'partner': [1, 2, 4, 8, 12],
  'network': [1, 2, 4, 8],
  'capitals': [2, 4, 8, 16],
  'continents': [6, 12, 18, 24, 36],
  'continent-europa': [3, 6, 10, 16, 24],
  'likes': [1, 2, 4, 8, 12],
}
const OTHER_CONTINENT_POINTS = [8, 12, 18, 24, 36]

const SINGLE_POINTS: Record<string, number> = {
  'commenter': 1, 'tagged': 1, 'hit': 2, 'viral': 4,
  'home': 1, 'team': 1, 'regular': 1, 'turbo': 1, 'director': 1, 'spring': 1, 'summer': 1, 'autumn': 1, 'winter': 1,
  'roadtrip': 2, 'weekend': 2, 'denmark': 2, 'paaske': 2, 'halloween': 2, 'jul': 2, 'newyear': 2, 'birthday': 2, 'comeback': 2,
  'gang': 2, 'filmstar': 2, 'live': 4, 'photographer': 2, 'author': 2, 'magnet': 2, 'jubilee-10': 2,
  'far': 4, 'border': 4, 'neighbour': 4, 'streak': 4, 'stardust': 4, 'fivestar': 4, 'peoples': 4, 'original': 4,
  'jubilee-25': 4, 'jubilee-50': 4, 'jubilee-75': 4,
  'world': 8, 'equator': 8, 'arctic': 8, 'longhaul': 8, 'jubilee-100': 8,
  'nordic': 16,
}
const PIONEER_POINTS = 3
const YEAR_POINTS = 10

export const LEVELS = [
  { at: 0, title: 'Nybegynder' },
  { at: 10, title: 'Klistrelærling' },
  { at: 25, title: 'Gadeplakat' },
  { at: 45, title: 'Lygtepæls-kender' },
  { at: 75, title: 'Byvandrer' },
  { at: 115, title: 'Eventyrer' },
  { at: 170, title: 'Globetrotter' },
  { at: 240, title: 'Verdensstjerne' },
  { at: 330, title: 'Mester-klistrer' },
  { at: 450, title: 'Stenbygaard-legende' },
]

/** Sætter points (opnået) og worth (hvad den giver) på alle badges */
function score(badges: Badge[]) {
  for (const b of badges) {
    if (b.kind === 'tier') {
      const pts = TIER_POINTS[b.id] ?? (b.id.startsWith('continent-') ? OTHER_CONTINENT_POINTS : [])
      b.steps?.forEach((s, i) => { s.points = pts[i] ?? 0 })
      b.points = pts.slice(0, b.level).reduce((a, p) => a + p, 0)
      b.worth = pts[b.level] ?? 0
    }
    else if (b.id === 'pioneer') {
      b.worth = PIONEER_POINTS
      b.points = (b.count ?? 0) * PIONEER_POINTS
    }
    else if (b.kind === 'record') {
      b.worth = b.id.startsWith('year-') ? YEAR_POINTS : 0
      b.points = b.earned && b.final ? b.worth : 0
    }
    else {
      b.worth = SINGLE_POINTS[b.id] ?? 0
      b.points = b.earned ? b.worth : 0
    }
  }
  return badges
}

export function totalPoints(badges: Badge[]) {
  return badges.reduce((sum, b) => sum + b.points, 0)
}

/** Level 1–10 ud fra point, med titel og hvad der skal til for næste */
export function levelFor(points: number) {
  const i = LEVELS.reduce((best, l, idx) => (points >= l.at ? idx : best), 0)
  const next = LEVELS[i + 1]
  return { level: i + 1, title: LEVELS[i]!.title, points, at: LEVELS[i]!.at, next }
}
