# Badge-numre

Faste numre, så vi nemt kan tale om en badge ("ret x18"). Nye badges får næste ledige
nummer – numrene flytter sig aldrig, selvom rækkefølgen i appen ændres.
Reglerne og navnene står i `shared/utils/badges.ts` (id i parentes). Ikoner vælges af `app/utils/badgeIcons.ts`: egne 3D-motiver i `public/badges/custom/`, ellers Fluent Emoji 3D i `public/badges/`. De ti klassiske prøvesæt i `docs/designs/legacy-badges-preview*.md` er nu installeret (62 motiver); de ni spil-/valutamotiver er også i brug. De otte Bananjack-motiver er også aktive. Alle 83 badge-numre bruger nu custom design (79 forskellige motiver; jubilarer deler ikon).

## Trin-badges

| Nr. | Badge (id) | Trin |
|---|---|---|
| x1 | 🎯 Stickers (`stickers`) | Første klister 1 · Klistrelus 5 · Klistrefnat 10 · Sticker-mester 25 · Sticker-legende 50 |
| x2 | 🏙️ Byer (`cities`) | Byturist 5 · Bybuster 10 · Storbymenneske 15 · Metropol-mester 20 · Byernes konge 25 |
| x3 | ✈️ Lande (`countries`) | Grænsekrydser 3 · Eventyrer 5 · Globetrotter 10 · Verdensborger 15 |
| x4 | 🤝 Makker (`partner`) | Makker 2 · Venner 3 · BFF 5 · Dynamisk Duo 10 · Sindssyg ægte venner 15 (+ "med <navn>") |
| x5 | 🕸️ Netværk (`network`) | Social 2 · Netværker 3 · Samlingspunkt 5 · Kendt af alle 10 |
| x6 | 🏛️ Hovedstæder (`capitals`) | Hovedstads-turist 1 · Hovedstadsjæger 3 · Diplomat 5 · Verdensambassadør 10 |
| x7 | 🌐 Kontinenter (`continents`) | Interkontinental 2 · Verdensfarer 3 · Jordomrejsende 4 · Kosmopolit 5 · Hele kloden 6 |
| x8 | 🏰 Europa (`continent-europa`) | Interrail-turist · Europafarer · Europa-ekspert · Europamester · Europas konge (1/3/5/10/15, ikke DK) |
| x9 | 🦁 Afrika (`continent-afrika`) | Afrika-turist · Safari · Savannekender · Løvetæmmer · Løvernes konge |
| x10 | 🏯 Asien (`continent-asien`) | Backpacker · Rickshaw-rytter · Østens eventyrer · Shogun · Dragekejser |
| x11 | 🗽 Nordamerika (`continent-nordamerika`) | Amerika-turist · Road trip · American Dream · Cowboy · Mr. President |
| x12 | 🦜 Sydamerika (`continent-sydamerika`) | Sydamerika-turist · Sambakonge · Gaucho · Amazonas-ekspert · Inka-kongen |
| x13 | 🦘 Oceanien (`continent-oceanien`) | Down Under · Kænguru-ven · Surfer · Krokodillejæger · Kænguru-kongen |
| x53 | 👍 Likes (`likes`) | Liket 1 · Populær 5 · Folkets stemme 10 · Influencer 25 · Sindssygt 50 👍 på kommentarer |

## Enkelt-badges

| Nr. | Badge (id) | Krav |
|---|---|---|
| x14 | 🌍 Pioner (`pioneer`) | Første sticker i et nyt land (point pr. land) |
| x15 | ⏳ Ægte (`original`) | Med til en af de 5 første stickers |
| x16 | 🏠 Hjemmebane (`home`) | En sticker i Danmark |
| x17 | 🇩🇰 Rundt i Danmark (`denmark`) | 5 danske byer |
| x18 | 🏡 En ægte nabo (`neighbour`) | Sverige, Norge og Tyskland |
| x19 | 🌲 Nordisk mester (`nordic`) | DK, SE, NO, FI og IS |
| x20 | 🐻‍❄️ Pisse koldt (`arctic`) | Nord for polarcirklen |
| x21 | 🌏 Fucking varmt (`equator`) | Syd for ækvator |
| x22 | 🛣️ Roadtrip (`roadtrip`) | 3 byer inden for 2 uger |
| x23 | 🧳 Langtur (`longhaul`) | To stickers over 5.000 km fra hinanden |
| x24 | 🔄 Comeback (`comeback`) | Ny sticker efter et halvt års pause |
| x25 | 🎂 Fødselsdagsfest (`birthday`) | 27. juli |
| x26 | 👨‍👩‍👧‍👦 Hele banden (`gang`) | Sat op af 4 eller flere |
| x27 | 🔁 Stamkunde (`regular`) | 2 stickers i samme by |
| x28 | 🛫 Langt hjemmefra (`far`) | Over 1.000 km fra Aalborg |
| x29 | 🚀 Ud i verden (`world`) | Over 5.000 km fra Aalborg |
| x30 | 🚂 Grænsehopper (`border`) | 2 lande inden for 7 dage |
| x31 | 👯 Holdspiller (`team`) | Sammen med andre |
| x32 | ⚡ Turbo (`turbo`) | 2 stickers samme dag |
| x33 | 📆 Weekendkriger (`weekend`) | 5 stickers i weekender |
| x34 | 🔥 Stime (`streak`) | 3 måneder i træk |
| x35 | 🌷 Forår (`spring`) | Marts–maj |
| x36 | ☀️ Sommer (`summer`) | Juni–august |
| x37 | 🍂 Efterår (`autumn`) | September–november |
| x38 | ❄️ Vinter (`winter`) | December–februar |
| x39 | 🐣 Påske (`paaske`) | I påsken |
| x40 | 🎃 Halloween (`halloween`) | 26/10–1/11 |
| x41 | 🎄 Jul (`jul`) | 20/11–31/12 |
| x42 | 🎆 Nytår (`newyear`) | 31/12 eller 1/1 |
| x43 | 🎬 Instruktør (`director`) | En sticker med video |
| x44 | 🎥 Filmstjerne (`filmstar`) | 3 stickers med video |
| x66 | 🔴 Er vi live? (`live`) | 5 stickers med video |
| x45 | ✍️ Forfatter (`author`) | Beskrivelse over 300 tegn |
| x46 | 📸 Fotograf (`photographer`) | 3+ billeder/videoer på én sticker |
| x47 | 🧲 Magnet (`magnet`) | 5 stemmer på én sticker |
| x48 | 🗼 Tommel-tårn (`stardust`) | 4,5+ 👍 og flere end 3 stemmer |
| x49 | 🖐️ Fuld hånd (`fivestar`) | 5,0 👍 og mindst 3 stemmer |
| x50 | 🗳️ Folkets valg (`peoples`) | 20 stemmer i alt |
| x51 | 💬 Første kommentar (`commenter`) | Skriv en kommentar |
| x52 | 🏷️ Tagget (`tagged`) | Bliv tagget |
| x54 | 💥 Hit (`hit`) | 5 👍 på én kommentar |
| x55 | 📣 Viral (`viral`) | 10 👍 på én kommentar |
| x56 | 🎉 Jubilar #10 (`jubilee-10`) | Sticker nr. 10 |
| x57 | 🎉 Jubilar #25 (`jubilee-25`) | Sticker nr. 25 |
| x58 | 🎉 Jubilar #50 (`jubilee-50`) | Sticker nr. 50 |
| x59 | 🎉 Jubilar #75 (`jubilee-75`) | Sticker nr. 75 |
| x60 | 🎉 Jubilar #100 (`jubilee-100`) | Sticker nr. 100 |

## Rekorder

| Nr. | Badge (id) | Krav |
|---|---|---|
| x61 | 🧭 Længst væk (`farthest`) | Længst fra Aalborg |
| x62 | ❄️ Nordligst (`north`) | Nordligste sticker |
| x63 | 🌴 Sydligst (`south`) | Sydligste sticker |
| x64 | ⭐ Publikumsfavorit (`favorite`) | Flest 👍 i snit |
| x65 | 🏆 Årets Dengse (`year-<år>`) | Flest stickers i året – én pr. år |

## Bananer og daglige spil

| Nr. | Badge (id) | Krav | Bananer pr. trin |
|---|---|---|---|
| x67 | Et bundt → Bananimperium (`banana-baron`) | Højeste saldo 1.000/5.000/10.000/25.000/50.000 | 50/100/200/400/800 |
| x68 | Rejseleder → Verdensguide (`city-guide`) | 1/10/30/100/250 rigtige byer; Rejseleder · Stifinder · Bykender · Verdensrejsende · Verdensguide | 20/40/80/160/320 |
| x69 | Uden GPS → Local Legend (`city-gps`) | 1/5/10/25/50 rigtige på første gæt | 20/40/80/160/320 |
| x70 | På rette spor → Aldrig faret vild (`city-streak`) | 3/7/14/30/100 spildøgn med rigtigt svar i træk; På rette spor · Sporsans · Sikker kurs · Altid på rette spor · Aldrig faret vild | 10/25/50/100/250 |
| x71 | En omgang mere → Hjulminister (`wheel-spins`) | 7/30/100/200/365 spins | 25/50/100/200/400 |
| x72 | Fast inventar → Møder altid op (`wheel-streak`) | 3/7/14/30/100 spildøgn med spin i træk | 10/25/50/100/250 |
| x73 | Hjulets udvalgte (`wheel-jackpot`) | Ram dagens jackpot (400–1.000) på hjulet | 250 |
| x74 | I sidste øjeblik (`city-last`) | Rigtigt svar på femte gæt | 25 |
| x75 | Nitteekspert (`wheel-nits`) | Tre nitter i på hinanden følgende spins | 25 |

Hvert trin udbetales én gang. Formuebadge giver ingen levelpoint; spiltrin giver 1/2/3/4/5 point, og x73–75 giver 2/1/1 point. Gamle badges giver 20 bananer pr. point pr. trin, Pioner 60 pr. land, og Årets Dengse 200 efter årets udgang. Midlertidige rekorder giver ingen bananer.

## Bananjack

Alle otte er aktive med statistik, profilvisning, notifikationer og engangsbelønninger pr. trin. Ikonerne ligger i `public/badges/custom/`. Generelle casino-badges kommer senere.

| Nr. | Badge (id) | Krav | Bananer | Point |
|---|---|---|---|---|
| x76 | Ved bordet (`jack-rounds`) | 1/10/50/100/500 runder | 10/20/40/75/150 | 1/2/3/4/5 |
| x77 | Bananbanker (`jack-wins`) | 1/10/25/100/250 vundne hænder | 10/25/50/100/200 | 1/2/3/4/5 |
| x78 | Bananjack! (`jack-naturals`) | 1/5/15/50/100 naturlige blackjacks | 20/40/75/150/300 | 1/2/3/4/5 |
| x79 | Is i maven (`jack-doubles`) | 1/5/15/30/75 sejre efter fordobling | 15/30/60/100/200 | 1/2/3/4/5 |
| x80 | Del og hersk (`jack-split`) | Vind begge hænder efter ét split | 50 | 2 |
| x81 | To modne i træk (`jack-back-to-back`) | Naturlig blackjack i to runder i træk | 100 | 4 |
| x82 | På stregen (`jack-five-card`) | Præcis 21 med mindst fem kort | 75 | 3 |
| x83 | Dealeren gik over (`jack-dealer-bust`) | Vind med højst 16, fordi dealeren går over | 25 | 1 |

Næste ledige nummer: **x84**
