// Farvede 3D-ikoner: Fluent Emoji (MIT, public/badges/LICENSE.md) og egne motiver til x67–75.
// Fluent-filer er160px WebP; egne motiver i custom/ er op til256px med alpha. Filnavnet er badge-id'et; jubilæer og "Årets Dengse" deler et
// ikon hver. Uden et ikon (fx Rundt i Danmark, der bruger flaget) vises emojien.
const SHARED: Record<string, string> = { jubilee: 'jubilee', year: 'year' }

const MISSING = new Set(['denmark'])
const CUSTOM = new Set(['banana-baron', 'city-guide', 'city-gps', 'city-streak', 'wheel-spins', 'wheel-streak', 'wheel-jackpot', 'city-last', 'wheel-nits'])

export function badgeIcon(id: string) {
  if (MISSING.has(id)) return undefined
  if (CUSTOM.has(id)) return `/badges/custom/${id}.webp`
  const prefix = id.split('-')[0]!
  return `/badges/${SHARED[prefix] ?? id}.webp`
}
