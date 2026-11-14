# Kryds & tværs #1

Spillet er lukket som standard. Admin vælger et fremtidigt åbningstidspunkt på `/admin/krydsord` i dansk tid (Europe/Copenhagen). Uden tidspunkt står der »Tidspunkt følger« i menuen. Menukortet bruger et neutralt gitter, ingen svarord eller bananillustration. Direkte links afslører heller ikke opgaven før åbningen.

Løsningen ligger kun i `server/data/crossword.ts`. Offentlig GET `/api/games/crossword` returnerer kun metadata før åbningen; bagefter returneres ledetråde, positioner, billeder og ordlængder, aldrig svar. Hele løsningen kontrolleres på serveren, når alle felter er udfyldt. Før den daglige hjælp starter, gives kun samlet korrekt/forkert. Den tidsstyrede hjælp nedenfor giver derefter én daglig markering af korrekte bogstaver.

Første korrekte indsendelse fra en bruger reserverer vinderen via en global CAS i Redis-hash `crossword-games`, felt `1`. Lokal udvikling bruger tilsvarende kø og Nitro-lagring. Vinderen får præcis 500 konkurrencebananer via wallet-kvitteringen `crossword:1:winner` samt x104 `crossword-1-winner` (1 point, ingen ekstra badgebananer). Hvis processen stopper mellem vinderreservation og udbetaling, genoptager næste almindelige GET/POST udbetalingen idempotent. Vinderen bevares permanent; andre kan færdiggøre uden konkurrencepræmie. Vinderens navn vises på spilsiden og i menuen. Status opdateres løbende.

Admin-preview `/spil/krydsord?preview=1` kræver admin-cookie på både GET og POST. Det kan kontrollere en løsning uden at registrere deltagelse, vinder, badge eller penge. Et åbnet spil kan ikke planlægges om eller nulstilles i admin.

Menuen under Øvrige viser en nedtælling i timer, minutter og sekunder fra præcis 48 timer før det valgte åbningstidspunkt. Før det vises kun datoen, og uden et valgt tidspunkt vises ingen nedtælling. Nedtællingen opdateres hvert sekund og forsvinder ved åbningen; serveren afgør fortsat, hvornår selve krydsordet må hentes.

## Planlagte pushbeskeder

Når åbningstidspunktet gemmes på drift, planlægges to QStash-kald: én time før start og ved åbningen. Første besked linker til menuen; åbningsbeskeden går til selve krydsordet. Vercel Hobby understøttes uden hyppige Vercel-cronjobs. Sæt `QSTASH_TOKEN` som Production-miljøvariabel i Vercel og redeploy; hvis Upstash-konsollen angiver en regional API-adresse, sættes den som `QSTASH_URL`. Gem derefter tidspunktet igen på `/admin/krydsord`. Admin viser, om planlægningen lykkedes, mangler konfiguration eller skal forsøges igen. Der planlægges og sendes aldrig beskeder fra lokal udvikling eller Preview.

Serveren publicerer til QStash med `Upstash-Not-Before` og kalder den faste produktionsadresse `POST /api/cron/crossword`. Callback kræver en serverhemmelig HMAC af QStash-tokenen i Authorization-headeren; hverken token eller callback-hemmelighed udleveres til browseren. Beskeder indeholder kun åbningstidspunkt og beskedtype. Ved tidspunkter mere end seks dage frem relæes jobbet i intervaller på højst seks dage, så gratisplanens syvdagesgrænse for forsinkelse overholdes. QStash udfører jobbene, selv når ingen besøger appen; pushlevering til telefonen afhænger stadig af enhed og netværk.

Ved levering kontrolleres det aktuelle starttidspunkt igen. Aflyste eller flyttede tidspunkter ignoreres, og den private `pushSent`-kvittering reserveres atomisk via krydsordets CAS, så samtidige callbacks ikke udsender samme besked flere gange. En påmindelse sendes aldrig efter åbningen; en åbningsbesked droppes, hvis den er over en time forsinket. Hvis start vælges med under en times varsel, planlægges kun åbningsbeskeden. Gentaget gemning og genudgivelse nulstiller ikke kvitteringer. Alle med push kan modtage beskederne, også uden navn; typen `crossword` kan slås fra under Notifikationer. Endpoints deduplikeres mellem offentlige og personlige abonnementer, præferencer tjekkes ved afsendelsen, og ugyldige abonnementer ryddes op.

En bruger skal være logget ind for at få en løsning godkendt og deltage. Lokale bogstaver gemmes separat for hver bruger og for preview. Opdater ikke den private opgavedefinition efter konkurrencen er åbnet. Backups indeholder planlægning, vinder, gennemførelser og alle wallets.

## Ord og layout

Den samlede ordliste er `docs/designs/crossword/word-list.json`: 104 par, alle placeret i den private kladde på 28 × 30 felter. »Spis« til ÆD og »Nøjagtig« til PRÆCIS er godkendt. »Før løbsdagen« til PASTA er stadig et forslag. RTABEN er valgt til billede 2. De to fotoplaceholders er erstattet med brugerens billeder: billedet i vandet til IKONISK og Skagen Marathon-billedet til RTABEN. Der er fire små billedikoner: tre placeholders og et cartoonagtigt 3D-håndikon med transparent baggrund til OK. Fotos ligger som WebP under neutrale filnavne i `public/games/crossword/`, og hverken filnavn eller alt-tekst indeholder svarord. Alle 104 ord er forbundet med hinanden via 123 krydsninger. Alle sammenhængende vandrette og lodrette bogstavrækker med mindst to felter har et svar med tilhørende ledetråd; ingen ekstra skillevægge eller tilfældige bogstavrækker. Hele opgaven er fortsat en admin-preview, indtil åbningstidspunktet vælges.

## Layoutversioner

Den oprindelige udgave uden vægge er gemt i `docs/designs/crossword/snapshots/2026-11-11-wall-free-v1/` med manifest, originale filer og preview. Ordplaceringen kan gendannes alene ved at kopiere snapshot-mappens `server/data/crossword.ts` tilbage. Databasens åbningstid, vinder og saldi må ikke rulles tilbage.

Den nye udgave bevarer de oprindelige 61 ord og tilføjer de 43 efterfølgende ord. Den har 123 krydsende bogstaver mod 54, én forbundet ordgruppe mod ti og ingen fritstående ord mod syv. Den servergenererede layoutrevision holder bogstaver fra forskellige kladder adskilt på enheden.

EGO (»Emil har et stort«) forbinder JULEKALENDER med CASINO. PRÆCIS forbinder også JULEKALENDER med CYKEL og BROSTEN. IDA har ledetråden »Yapper«; »Ironman« til DYRT er uændret.

Seneste tilføjelser: TAPER (Før race), SNE (Træls løbeforhold), BIKINI (Svømmeudstyr), ALT (Det hele), FRI (Efter work), FIN (Pæn), AI (Chat), KAMP (Slås), LORT (WC), BÅT (Dyt), NIKS (Nej) og ASS (Jack). TED er erstattet med BÅT; DAMP og GRINE udgår efter brugerens valg for at bevare de øvrige placeringer. Kun DYRT er flyttet for at undgå den utilsigtede række ÅT under BÅT. Alle øvrige oprindelige ord beholder deres positioner.

NI (»<10«) står lodret med N over det andet I i IKONISK. Ingen eksisterende ord er flyttet.

OL (»4. år«) krydser L i COLNAGO lodret. JERN (»....mand«) krydser J i JULEKALENDER vandret. TOLK, SORT og TABEL udgår efter brugerens valg om at bevare placeringerne.

ØDE (»Tomt«) krydser D i JULEKALENDER vandret. PENGE (»Købekraft«) starter lodret ved P i PRÆCIS. KARL (».... smart«) krydser R i BRYGHUS vandret og skaber ÅL (»Vand slange«) sammen med Å i BÅT. Ingen eksisterende ord er flyttet. RIG, OG og GÅ udgår efter brugerens valg om at bevare alle eksisterende placeringer.

OK bruger et genereret håndikon i `public/games/crossword/ok-hand-v3.webp` som billedledetråd (ét felt) og krydser K i KARL lodret. Emojien og det første SVG-forsøg er erstattet med det nye ikon. Originalen er gemt i `docs/designs/crossword/ok-hand-v3.png`. ÅR (»Tid«) krydser R i JERN lodret, og VI (»Os«) krydser V i LIVE vandret. Alle eksisterende placeringer er bevaret.

## Adminfacit

»Vis facit« på `/admin/krydsord` åbner `/admin/krydsord-facit`. Her vises hele løsningen i et skrivebeskyttet gitter med de samme 1×/2×/3× zoomtrin og panorering. Facit hentes kun fra adminbeskyttet GET `/api/admin/crossword/solution` med `Cache-Control: private, no-store`. Den almindelige spil- og preview-API indeholder fortsat ingen facitdata. Visningen læser og skriver ikke spillerens lokale svar, validerer ikke indsendelser og ændrer ingen præmier, gennemførelser, vinder eller åbningstid. Starttidspunktet vælges fortsat på `/admin/krydsord` i dansk tid.

## Daglig hjælp kl. 04

Første hjælp kommer kl. 04.00 dansk tid på åbningsdatoen plus to kalenderdage. Eksempel: åbner spillet mandag (uanset klokkeslæt), starter hjælpen onsdag kl. 04. Beregningen følger Europe/Copenhagen og sommer-/vintertid, ikke en fast 48-timers forsinkelse. Derefter genberegnes markeringerne hver dag kl. 04, indtil brugerens løsning er godkendt.

POST `/api/games/crossword/help` gemmer spillerens delvise bogstaver i den private spiltilstand (`progress`, pr. bruger eller anonym enhed). Ved første forespørgsel efter dagens kl. 04 beregnes markeringerne ud fra den senest gemte fremgang før nye ændringer fra forespørgslen. Genindlæsning og flere forespørgsler samme dag returnerer samme resultat. Hvis appen var lukket, gennemføres kontrollen ved næste åbning ud fra de senest gemte svar. Nye rettelser efter kontrollen vurderes først næste kl. 04. Første gang en eksisterende lokal løsning synkroniseres, bruges dens bogstaver som udgangspunkt.

Kun bogstaver, spilleren allerede har udfyldt korrekt, returneres; tomme eller forkerte felter afsløres ikke. Bekræftede felter vises med grøn baggrund og mørk/lys grøn tekst. Ændres et bekræftet bogstav til et andet, fjernes den grønne markering straks. Tid og dagsgrænse kontrolleres på serveren og kan ikke fremrykkes med klientens ur eller request-parametre. Preview og adminfacit ændrer ikke fremgangen og udløser ingen hjælp. Backups af spiltilstanden omfatter den gemte fremgang.

## Rangliste i krydsordet

En lille ranglisteknap i spillets top åbner `CrosswordLeaderboard.vue`. Popupen henter `/api/games/crossword/leaderboard` og opdaterer hvert 15. sekund, mens den er åben. Alle der har skrevet mindst ét bogstav registreres, også hvis de senere rydder felterne. Navngivne deltagere vises med deres offentlige navn, anonyme enheder som Anonym 1 osv.; rå enheds-id’er og indtastede bogstaver returneres aldrig.

Før første hjælp vises udfyldte ord/totalOrd og udfyldte unikke bogstavfelter/totalBogstaver, uden at sammenligne svarene med facit. Efter hjælpens start vises kun korrekte felter og hele korrekte ord fra den daglige kl. 04-gennemgang. Nye rettelser kan ikke øge korrekthedstallene før næste daglige tjek. For offline deltagere kan GET beregne samme visning ud fra de senest gemte svar uden at ændre spiltilstanden. Godkendte gennemførelser er altid fuldførte; vinderen står først, derefter øvrige gennemførelser og deltagere sorteret efter ord, bogstaver og starttid.

API’en er lukket indtil åbningstidspunktet. Admin-preview kan se oversigten tidligere med admin-cookie, men egne prøvesvar registreres ikke som deltagelse. Ranglisten sender ingen præmier eller notifikationer og indeholder ikke facit, bogstavpositioner eller de private hjælpefelter.
