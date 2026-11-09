// "Hvad er nyt" (/nyheder). Kun ting brugerne kan mærke – ikke admin, backup o.l.
// Nyeste først. Udfyld date, når versionen kommer på den rigtige app.
export interface Release {
  version: string
  /** YYYY-MM-DD – mangler den, vises "Ny" */
  date?: string
  /** Optional mobile push for this release. */
  push?: { title: string; body: string; url: string }
  notes: string[]
}

export const CHANGELOG: Release[] = [
  {
    version: '2.4',
    push: {
      title: '🎁 Et nyt julespil er på vej!',
      body: 'Se Dagens bokse under Spil. Det åbner 20. november kl. 04.00. Roulette er også på vej.',
      url: '/spil',
    },
    notes: [
      'Dagens bokse kan ses under Spil allerede nu – spillet åbner 20. november kl. 04.00',
      'Fire nye julebadges: Hattrick, Nisseinvasion, Triple Miv og Den gyldne trio',
      'Roulette er på vej – se det kommende fælles bord i casino-menuen',
      'Bundmenuen har fået sin egen faste plads og dækker ikke længere sidens indhold',
      'Mindre fejlrettelser og forbedringer i appens layout',
    ],
  },
  {
    version: '2.3.1',
    date: '2026-11-07',
    push: {
      title: '🎰 Bananditten er landet!',
      body: 'Prøv casinoets nye spilleautomat, og optjen fem nye badges.',
      url: '/spil/bananditten',
    },
    notes: [
      'Bananditten er åben! Spin for 5–25 bananer, og jagt jackpotten på 100×',
      'Fem nye Bananditten-badges samt lyd på spin og gevinster',
      'Fælles daglig tabsgrænse på 300 bananer netto i casinoet – gevinster giver plads igen',
      'Brugere & rangliste har fået sin egen fane i bundmenuen',
      'Ny Shop-fane – her kan du snart bruge dine optjente bananer',
      'Se de nye funktioner i Hvad er nyt, første gang du åbner en ny version',
      'Små fejlrettelser og forbedringer i appen',
    ],
  },
  {
    version: '2.3',
    date: '2026-11-05',
    push: {
      title: '🎉 Bananjack er landet!',
      body: 'Casinoet er åbent! Prøv Bananjack, vind bananer og optjen nye badges.',
      url: '/spil/casino',
    },
    notes: [
      'Bananjack er åbent i casinoet med otte badges og banangevinster',
      'Bananditten vises som Kommer snart i casinoet',
      'Bananjack har fået kortlyde, der følger uddelingen, og en lydknap',
      'Få en mobilnotifikation, når en ny version af appen udgives',
      'Vælg Appopdateringer til eller fra under Notifikationer',
      'Badge-push springes over på enheder, hvor appen er åben',
      'Lukkede badge-popups huskes også ved netværksfejl og genåbning af appen',
      'Lykkehjulets baggrund følger nu lyst og mørkt tema',
      'Bananformue-badgen har fået et nyt motiv uden Emil',
    ],
  },
  {
    version: '2.2',
    date: '2026-10-31',
    notes: [
      'Daglige spil: Gæt dagens by, og drej lykkehjulet',
      'Optjen bananer fra stickers, badges og daglige spil',
      'Se dit voksende bananlager og dine seneste bevægelser',
      'Sammenlign badges, point, bananer og stickers på ranglisten',
      'Nye badgeikoner og opdaterede navne',
      'Casino-fanen er klar – Bananjack kommer snart',
    ],
  },
  {
    version: '2.1',
    date: '2026-10-26',
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
    notes: ['Opdater-knap på kortet og listen'],
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
