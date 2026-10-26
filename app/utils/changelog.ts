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
    version: '2.1',
    notes: [
      'Vælg dit navn under »Mig«, og upload et profilbillede',
      'Kommentér stickers, svar hinanden og tag med @',
      'Giv 👍 til stickers (1–5) og til kommentarer',
      'Få besked, når nogen tagger dig, svarer dig eller kommenterer din sticker',
      'Vælg selv hvilke notifikationer du vil have 🔔',
      'Nye badges og level op med konfetti 🎉',
      'Nye 3D-badges, og flere har fået nye navne',
    ],
  },
  {
    version: '2.0',
    date: '2026-10-25',
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
