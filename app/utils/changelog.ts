// "Hvad er nyt" (/nyheder). Kun ting brugerne kan mærke – ikke admin, backup o.l.
// Nyeste først. Udfyld date, når versionen kommer på den rigtige app.
export interface Release {
  version: string
  /** YYYY-MM-DD – mangler den, vises "Ny" */
  date?: string
  notes: string[]
}

export const CHANGELOG: Release[] = [
  {
    version: '2.0',
    notes: [
      'Tilføj selv en sticker med + knappen',
      'Nye stickers dukker op af sig selv',
      'Del en sticker med dine venner',
      'Se Emils rejse som animation på kortet',
      'Få besked, når Emil lander et nyt sted 🔔',
      'Profiler med badges og levels – tryk på et navn',
      'Verdenskort over alle lande Emil har været i',
      'Installer appen på din telefon',
      'Halloween-, jule- og påsketema 🎃🎄🐣',
    ],
  },
  {
    version: '1.0.1',
    date: '2026-10-23',
    notes: [
      'Opdater-knap på kortet og listen',
    ],
  },
  {
    version: '1.0',
    date: '2026-10-22',
    notes: [
      'Kort og liste over alle Stenbygaard-stickers',
      'Billeder og video af hver sticker',
      'Giv stjerner til dine favoritter ⭐',
    ],
  },
]
