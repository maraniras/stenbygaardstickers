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
    version: '2.10.1.5',
    date: '2026-11-27',
    notes: ['På Tværs: Zoom op til 5× med zoomknapperne eller to fingre på selve krydsordet.'],
  },
  {
    version: '2.10.1.4',
    date: '2026-11-27',
    notes: [
      '9 nye badges til pakkelegen — for seksere, gavetyverier og julemirakler.',
      'Se dine seksere, stjålne og mistede gaver i din egen spillerboks.',
      'Se, hvor mange af dagens tre slag hver spiller har brugt.',
      'Få en påmindelse kl. 20.00, hvis du stadig har terningeslag tilbage.',
    ],
  },
  {
    version: '2.10.1.3',
    date: '2026-11-25',
    notes: [
      'Bananjack fylder mindre på mobilen: kompakt resultatbesked og casinotal samt Split, Fordobl, Træk kort og Stå på én række.',
      'Du får nu også besked om nye kommentarer på stickers, du tidligere har kommenteret. Tags og kommentarer på dine egne stickers giver fortsat besked uden dubletter.',
    ],
  },
  {
    version: '2.10.1.2',
    date: '2026-11-25',
    notes: [
      'På Tværs #2 får en eksklusiv profilramme og et banner som vinderpræmier sammen med 1.000 bananer. Rammen vises i menuen, og spilkortet skifter til normalt layout ved åbning.',
      'Din eneste profilramme eller dit eneste banner vælges automatisk. Du kan stadig vælge det fra.',
      'Øvrige spil sorteres efter status. Åbne spil uden en vinder markeres med LIVE.',
      'Grupperede stickers på kortet viser nu også Emil-ikonet.',
    ],
  },
  {
    version: '2.10.1.1',
    date: '2026-11-25',
    notes: [
      'Mere sikker billedupload: Prøv fejlede uploads igen. Stickeren kan først sendes, når de valgte filer er uploadet eller fjernet. Bedre håndtering af kamerafotos på mobilen.',
      'Lukknapperne er centreret i blandt andet krydsordets rangliste, information og billedvisning.',
      'Rettede ledetråde i På Tværs #2.',
      'Hotfixes kan stadig læses under Hvad er nyt, men åbner ikke længere en automatisk pop-up.',
    ],
  },
  {
    version: '2.10.1.0',
    date: '2026-11-24',
    notes: [
      'På Tværs #2 er på vej! Find det nederst under Øvrige spil. Denne gang bliver det større.',
      'På Tværs: Korrekte felter låses grønt ved det daglige tjek. Forkerte felter bliver røde, indtil du retter eller sletter bogstavet.',
      'Fra På Tværs: Doomsday Special kan du købe op til ti bogstaver pr. krydsord. Prisen starter på 50 bananer og stiger med 50 pr. køb til 500. Pris og grænse nulstilles for hvert krydsord. Købte bogstaver følger din bruger på alle enheder.',
    ],
  },
  {
    version: '2.10.0',
    date: '2026-11-23',
    notes: [
      'På Tværs #1: Hjælpen starter tirsdag den 24. november kl. 04.00. Korrekte bogstaver markeres grønt og tjekkes igen hver dag kl. 04.',
      'Vinderen af På Tværs #1 får også en eksklusiv profilramme og et profilbanner i guld og grønt.',
      'På Tværs: Doomsday Special — første korrekte løsning vinder 500 bananer, en eksklusiv badge, en profilramme og et profilbanner. Alle øvrige får 50 bananer for at gennemføre.',
      'Vælg dine profilbannere i indstillingerne og vis dem på din profil og i brugerlisten.',
      'Forbedret pasform på profilrammer. Lykkehjulets gevinst vises først i saldoen, når hjulet er færdigt.',
    ],
  },
  {
    version: '2.9.7',
    date: '2026-11-22',
    notes: ['Kryds & tværs: Første hjælp starter onsdag den 25. november kl. 04.00'],
  },
  {
    version: '2.9.6',
    date: '2026-11-21',
    notes: [
      'Flere julepræmier: Nye fysiske præmier i pakkelegen og julekalenderen',
      'Opdateret præmieoversigt: Se, hvad du kan finde i julekalenderen',
      'Kryds & tværs: Første hjælp starter mandag den 23. november kl. 04.00',
      'Mindre rettelser og forbedringer',
    ],
  },
  {
    version: '2.9.5',
    date: '2026-11-20',
    notes: ['Mindre rettelser og forbedringer'],
  },
  {
    version: '2.9.4',
    date: '2026-11-20',
    notes: [
      'Optimeret datahentning og færre unødvendige databasekald i spil, ratings og bananlager',
    ],
  },
  {
    version: '2.9.3',
    date: '2026-11-20',
    notes: [
      'Kryds & tværs: Tofingerzoom er begrænset til krydsordet, og zoomknapperne vælger faste zoomniveauer',
      'Mere plads til krydsordet: Hjælpen findes nu bag infoknappen ved ranglisten, og vinderbanneret vises først, når nogen har vundet',
    ],
  },
  {
    version: '2.9.2',
    date: '2026-11-20',
    notes: ['Forbedret planlægning af påmindelser om Kryds & tværs og kommende julespil'],
  },
  {
    version: '2.9.1',
    date: '2026-11-20',
    notes: [
      'Dagens bokse: Rettet spejlvendte spørgsmålstegn og overlap på åbnede bokse i iOS. Rettelsen gælder også dine allerede åbnede bokse',
      'Pakkeleg: Nu tre slag om dagen gennem hele spillet – også når du stjæler',
      'Seks nye gaveindpakninger: svømmefødder, snorkel og briller, cykelhjul, cykelhjelm, løbesolbriller og en bil',
      'Profilrammegaven i pakkelegen giver nu også 50 bananer. Præmiefordelingen er desuden justeret',
      'Hotfix-opdateringer sender fremover ingen opdateringspush',
    ],
  },
  {
    version: '2.9',
    date: '2026-11-18',
    push: {
      title: '🍌 Wordle er landet!',
      body: 'Gæt dagens ord og vind bananer.',
      url: '/nyheder',
    },
    notes: [
      'Dagens Wordle: Ét ord, fem bogstaver og seks forsøg. Måske en reference? Vind op til 50 bananer hver dag',
      'Nye Wordlebadges: Gå efter sejre, stimer og ren clairvoyance. Se også din Wordle-statistik på profilen',
      'Mere enkel navigation: Skift mellem kort og liste under Udforsk. Filtrér på personer og lande, og vend tilbage til samme sted',
      'Din aktivitet samlet: Find dine personlige beskeder i den nye aktivitetsoversigt på profilen',
      'Mere pakkeleg: Tre gaver pr. deltager og tre slag dagligt, indtil bordet er tømt. Derefter to slag. Gavegrådig kræver nu mindst fem gaver ved afslutningen',
      'Hold øje med julelysene: Julespil lyser op, når der er noget nyt at prøve. Du får også beskeder om tilmelding, spilstart og kalenderåbning',
      'Nye stickerbelønninger: Din første sticker i hvert land giver fuld belønning. De næste giver 250 bananer plus en eventuel forbedring af din distancerekord i landet. Tidligere belønninger genberegnes også, men saldoen kommer aldrig under nul',
      'En ekstra vinderpræmie: Første korrekte løsning af Kryds & tværs #1 vinder nu også en RTA-kop oven i 1.000 bananer og vinderbadgen',
      'Appen i dine indstillinger: Find både Hvad er nyt og muligheden for at installere appen samme sted',
      'Mindre fejlrettelser og forbedringer af brugeroplevelsen',
    ],
  },
  {
    version: '2.8',
    date: '2026-11-16',
    push: {
      title: '🖼️ Profilrammer og nyt i shoppen',
      body: 'Prøv otte profilrammer i shoppen, vælg dine egne i indstillingerne, og se nyhederne i Bananjack og pakkelegen.',
      url: '/nyheder',
    },
    notes: [
      'Profilrammer: Vælg mellem dine ejede rammer i indstillingerne, og giv dit profilbillede et personligt udtryk',
      'Kig indenfor i shoppen: Forhåndsvis otte forskellige profilrammer på dit eget profilbillede. Køb åbner senere',
      'Mere autentisk Bananjack: Efter utallige klager fra Hr. Norsk fortsætter kortbunken nu mellem dine runder og blandes igen, når mindst 75 % af kortene er brugt',
      'Flere gaver i pakkelegen: Der er nu 2,5 gave pr. deltager, rundet op. Pakkelegs Champ 2026 giver desuden fire point',
      'Flere beskeder om krydsordet: Få besked, når starten bliver annonceret, 24 timer og én time før åbning, ved åbning og når vinderen er fundet',
      'Roulette-statistikken på profilen har fået sit eget rouletteikon',
      'Mindre fejlrettelser og forbedringer af brugeroplevelsen',
    ],
  },
  {
    version: '2.7.1',
    date: '2026-11-15',
    push: {
      title: '🎡 Lille rouletteopdatering',
      body: 'Roulettevisningen er blevet mere enkel og overskuelig.',
      url: '/spil/roulette',
    },
    notes: ['En mere enkel roulettevisning uden hjælpeteksten under rundestatussen'],
  },
  {
    version: '2.7',
    date: '2026-11-15',
    push: {
      title: '🎡 Roulette er nu live!',
      body: 'Spil ved det fælles roulettebord, gå efter syv nye badges, og se hvem der har lagt indsatser.',
      url: '/spil/roulette',
    },
    notes: [
      'Roulette er åbnet i casinoet: Alle spiller på samme hjul med en ny runde hvert halve minut',
      'Du har 20 sekunder til indsatser. Vælg jetoner på 5, 10, 25 eller 50 bananer og spil på tal, farver, dusiner og kolonner – også grøn, der dækker både 0 og 00',
      'Se spillernes profilbilleder på deres felter og de seneste ti resultater under hjulet. Roulette har også egne lydeffekter, som kan slås fra',
      'Syv nye roulettebadges med egne 3D-ikoner, point og bananbelønninger. Din profil har også fået roulettestatistik',
      'Den fælles casinogrænse gælder også roulette: højst 300 bananer i nettotab om dagen på tværs af spillene',
      'Vinderpræmien i Kryds & tværs #1 er hævet til 1.000 bananer',
      'Mindre fejlrettelser og forbedringer af brugeroplevelsen',
    ],
  },
  {
    version: '2.6',
    date: '2026-11-14',
    push: {
      title: '🧩 Kryds & tværs er på vej!',
      body: 'Find det nye ordspil under Øvrige. Første korrekte løsning vinder 500 bananer og en særlig badge, når spillet åbner.',
      url: '/spil/oevrige',
    },
    notes: [
      'Ny fane under Spil: Øvrige – her finder du Kryds & tværs #1 med 104 ord og billedledetråde',
      'Krydsordet åbner på et fælles tidspunkt. De sidste 48 timer tæller menuen ned til start',
      'Første korrekte løsning vinder 500 bananer og en særlig vinderbadge. Alle andre kan stadig løse krydsordet',
      'Følg deltagernes fremgang på krydsordets rangliste. Efter åbningsdagen og én hel ekstra dag får du dagligt hjælp kl. 04 med grønne markeringer af korrekte bogstaver',
      'Bananditten har fået et statistikpanel på profiler med spins, gevinster, jackpots, bedste gevinststime og nettoresultat',
      'Julekalenderen får en illustreret præmieoversigt ved første besøg, som du også selv kan åbne igen',
      'Mindre fejlrettelser og forbedringer af brugeroplevelsen',
    ],
  },
  {
    version: '2.5.3',
    date: '2026-11-13',
    push: {
      title: '🗺️ Opdatering til dagens byspil',
      body: 'Vi har forbedret indlæsningen af luftfotoet i Emil er faret vild.',
      url: '/spil/byen',
    },
    notes: [
      'Mere stabil indlæsning af luftfotoet i Emil er faret vild – med en reserveadresse og bedre håndtering af billedcachen',
    ],
  },
  {
    version: '2.5.2',
    date: '2026-11-11',
    push: {
      title: '🎄 Julespillene har fået deres egen fane',
      body: 'Find Pakkeleg og Dagens bokse under Julespil. Julekalenderen dukker op 24. november.',
      url: '/spil/jul',
    },
    notes: [
      'Julespillene har fået deres egen fane under Spil – også når der kun er previews eller gaver, der venter på at blive åbnet',
    ],
  },
  {
    version: '2.5.1',
    date: '2026-11-11',
    push: {
      title: '👑 Pakkelegs Champ 2026',
      body: 'Pakkelegen får én samlet vinder. Flest gaver afgør det – se de nye Champ-regler i Hvad er nyt.',
      url: '/nyheder',
    },
    notes: [
      'Pakkelegs Champ 2026 går til årets vinder: flest gaver, derefter flest bananer i gaverne og til sidst først nået det endelige gaveantal',
    ],
  },
  {
    version: '2.5',
    date: '2026-11-10',
    push: {
      title: '🎄 Julehyggen er på vej!',
      body: 'Pakkeleg, fysiske præmier og nye badges! Tilmeldingen åbner 20. november. Se alle nyhederne i appen.',
      url: '/nyheder',
    },
    notes: [
      'Pakkelegen er på vej! Tilmeld dig 20.–26. november for 100 bananer. Vi starter 27. november kl. 04.00',
      'To terningeslag om dagen – slå en sekser, tag en gave fra bordet, eller stjæl fra de andre',
      'Kæmp om bananer, fysiske præmier og en eksklusiv juleprofilramme. Spillet slutter på et hemmeligt tidspunkt mellem jul og nytår, og du har derefter 14 dage til at åbne dine gaver',
      'Fire nye pakkelegsbadges: Røvrendt, Seksersekspert, Gavegrådig og Pakkebaron',
      'Julekalenderen dukker op under Spil 24. november kl. 04.00. Første låge åbner 1. december kl. 04.00',
      'Flere fysiske julepræmier: blandt andet Mix Max, Faxe Kondi, drikkedunke og træstammer',
      'Bananjack: Du kan nu også fordoble en startindsats på 50 bananer til 100',
    ],
  },
  {
    version: '2.4',
    date: '2026-11-09',
    push: {
      title: '🎁 Et nyt julespil er på vej!',
      body: 'Se Dagens bokse under Spil. Det åbner 20. november kl. 04.00. Roulette er også på vej.',
      url: '/spil',
    },
    notes: [
      'Julekalenderen vises fra 20. november og åbner 1. december kl. 04.00 dansk tid',
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
