// Farvede 3D-ikoner: Fluent Emoji (MIT, public/badges/LICENSE.md) og egne 3D-motiver.
// Fluent-filer er160px WebP; egne motiver i custom/ er op til256px med alpha. Filnavnet er badge-id'et; jubilæer og "Årets Dengse" deler et
// ikon hver. Alle nuværende badges har eget motiv; indlæsningsfejl falder tilbage til flag/emoji.
const SHARED: Record<string, string> = { jubilee: 'jubilee', year: 'year' }

const CUSTOM = new Set([
  'banana-baron', 'city-guide', 'city-gps', 'city-streak', 'wheel-spins', 'wheel-streak', 'wheel-jackpot', 'city-last', 'wheel-nits',
  'stickers', 'year', 'partner', 'original', 'pioneer', 'favorite',
  'arctic', 'equator', 'farthest', 'live', 'stardust', 'comeback',
  'gang', 'network', 'roadtrip', 'longhaul', 'border', 'nordic',
  'continent-europa', 'continent-afrika', 'continent-asien', 'continent-nordamerika', 'continent-sydamerika', 'continent-oceanien',
  'home', 'regular', 'team', 'cities', 'countries', 'capitals',
  'commenter', 'tagged', 'likes', 'hit', 'viral', 'fivestar',
  'director', 'filmstar', 'author', 'photographer', 'magnet', 'peoples',
  'continents', 'neighbour', 'far', 'world', 'north', 'south',
  'spring', 'summer', 'autumn', 'winter', 'halloween', 'jul',
  'denmark', 'birthday', 'turbo', 'weekend', 'streak', 'paaske', 'newyear', 'jubilee',
])

export function badgeIcon(id: string) {
  const prefix = id.split('-')[0]!
  const asset = SHARED[prefix] ?? id
  return `/badges/${CUSTOM.has(asset) ? 'custom/' : ''}${asset}.webp`
}
