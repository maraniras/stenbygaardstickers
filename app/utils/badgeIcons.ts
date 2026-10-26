// Farvede 3D-ikoner til badges (Microsoft Fluent Emoji 3D, MIT – se public/badges/LICENSE.md),
// skaleret til 160 px WebP. Filnavnet er badge-id'et; jubilæer og "Årets Dengse" deler et
// ikon hver. Uden et ikon (fx Rundt i Danmark, der bruger flaget) vises emojien.
const SHARED: Record<string, string> = { jubilee: 'jubilee', year: 'year' }

const MISSING = new Set(['denmark'])

export function badgeIcon(id: string) {
  if (MISSING.has(id)) return undefined
  const prefix = id.split('-')[0]!
  return `/badges/${SHARED[prefix] ?? id}.webp`
}
