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
      'Få besked, når Emil lander et nyt sted 🔔',
      'Profiler med badges og levels – tryk på et navn',
      'Verdenskort over alle lande Emil har været i',
      'Datoen udfyldes selv fra billedet, når du tilføjer en sticker',
      'Installer appen på din telefon',
      'Påsketema 🐣',
    ],
  },
  {
    version: '1.3',
    date: '2026-10-25',
    notes: [
      'Halloween- og juletema 🎃🎄',
    ],
  },
  {
    version: '1.2',
    date: '2026-10-25',
    notes: [
      'Tilføj selv en sticker med + knappen',
      'Nye stickers dukker op af sig selv',
      'Luftfoto på kortet',
      'Del en sticker med dine venner',
      'Se Emils rejse som animation på kortet',
    ],
  },
  {
    version: '1.1',
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
