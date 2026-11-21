# Pakkeleg – første version

Lokalt spil på `/spil/pakkeleg`. Isoleret simulation på `/spil/pakkeleg?preview=1`, kun med Nuxt dev: ingen API-slag, saldoændringer eller push. Link på Spil-siden. Ikke publiceret.

## Regler

- Tilmelding 20. november kl. 04 til og med 26. november kl. 23.59 dansk tid. Pris 100 bananer pr. bruger. Ingen eftertilmelding.
- Spillet starter 27. november kl. 04 dansk tid. Tre slag pr. tilmeldt bruger pr. spildøgn gennem hele spillet, både fra midten og ved tyveri. Nulstilling kl. 04; ingen opsparing.
- Kun seksere giver pakkevalg. 60 sekunder, ellers automatisk valg. Serveren behandler udløbne valg inden næste handling, også efter offlineperioder.
- Tag fra midten først. Når midten er tom, vælger man en anden brugers pakke. Egne pakker kan ikke vælges.
- Kun betalende tilmeldte brugere er med. 3 gaver pr. deltager: 7 deltagere giver 21 gaver, 10 giver 30. Andre kan se bordet som tilskuere.
- Fast udseende og nummer pr. pakke. Sluttidspunktet er hemmeligt til afslutningen. Indholdet er hemmeligt for alle, inklusive ejeren, indtil ejeren selv åbner pakken.
- Slut trækkes kryptografisk én gang i intervallet 25. december kl. 00 til 31. december kl. 23.59.59, dansk tid. Når tiden er gået, låses ejerskab. Afslutningen beregnes ved næste serverforespørgsel. Ejerskab låses, men ingen uåbnede præmier udbetales automatisk.
- Én Mix Max + 50 (to ved mindst 12 deltagere), én Faxe Kondi-flaske + 50, én Haribo Vampiri-pose + 50, én juleskumspose + 50, én RTA-kop + 50, én Sparekassen Danmark-drikkedunk + 50 og én TotalEnergies-drikkedunk + 50, én PostNord-vifte + 50, én Faxe Kondi-overtrækstrøje + 50, ét Faxe Kondi-svedbåndssæt + 50, én Copenhagen Sprint-cykelcap + 50, én Garmin-cykelcap + 50, én eksklusiv profilramme + 50 og én gylden gave med 500. Drillenisser giver 1 banan hver: tidligere antal reduceres med én (nu 2 ved 6–8 deltagere og 3 ved 9–10). Resten er banangaver på 25/50/100/150/250 efter vægt 3/3/2/2/2. Ingen træstammer, hvidvin eller snekugle i nye fordelinger. Der er fortsat 3 gaver pr. deltager og mindst 6 deltagere. Allerede fordelte spil ændres ikke.
- Minimum seks deltagere for at kunne rumme de faste præmier; ellers aflyses og 100 bananer refunderes én gang til hver tilmeldt.
- Gaverne fordeles tilfældigt på indpakningerne én gang ved spilstart efter tilmelding.
- Efter slut har ejerne præcis 14 dage til at åbne egne gaver. Andre ser først indhold og beløb efter åbning. Personkort summerer kun åbnede bananer, fysiske præmier og profilramme. Efter fristen skjules kortet på Spil, og pakkelegsiden viser afsluttet status. Uåbnede gaver bliver ikke automatisk udbetalt.
- Profilrammen gemmes som kosmetisk ejendel og sættes på vinderens avatar ved åbning.
- Julekalenderens personlige gaver holdes adskilt.
- x103 hedder Pakkelegs Champ 2026 og går til én samlet vinder: flest ejede gaver ved slut, derefter flest bananer i disse gaver (åbnede såvel som uåbnede), derefter først nået det endelige gaveantal. Fysisk værdi, startsaldo, gebyr og badgebonus tæller ikke. Første opnåelse gemmes varigt på bordet, uafhængigt af den korte aktivitetshistorik; ved identiske tidsstempler bruges serverens rækkefølge. Badgen kræver ikke fem gaver og giver fortsat 1 point/20 bananer én gang. Gavegrådig (x102) kræver nu mindst fem gaver ved slut. ID og ikon bevares.

## Lagring og sikkerhed

Admin → Pakkeleg (`/admin/pakkeleg`) viser de fysiske præmier pr. år efter afslutningen: endelig vinder, pakkenummer, åbning og udleveringsdato. Samme vinder kan have flere rækker; en gave tilbage på fællesbordet står uden vinder. Før afslutning afsløres ingen indhold eller vindere. Læsning opretter/afslutter aldrig et spil og udbetaler intet.

En åbnet fysisk præmie kan markeres som udleveret eller sættes tilbage til afventer. Dato gemmes i den eksisterende private `parcelRewards`-kvittering under wallet-CAS. Gentagne klik bevarer første dato, og udlevering ændrer ikke saldo, ejerskab eller præmieindhold. API kræver adminlogin og slår selv vinderen op ud fra gave-id. `/admin/pakkeleg?preview=1` er en lokal UI-simulation med fiktive rækker; knapperne kalder ikke API'et.

Redis-hash `parcel-games-v2` med år som felt; den tidligere gratis prototype er bevaret separat og bruges ikke. Global compare-and-set beskytter terninger, daglige grænser, ejerskab og udløbne valg samlet. Lokalt en serialiseret Nitro-storage-kø. Preview bruger den eksisterende `dev:`-isolering. Tilstand medtages i adminbackup.

Betaling og permanent claim `parcel-entry:<år>` gemmes atomisk i wallet-CAS. Serveren genskaber deltagerlisten ud fra disse kvitteringer, også ved afbrudt forbindelse mellem betaling og opdatering af bordet. Gentagne forsøg trækker ikke igen. En allerede betalt kvittering kan genoptages efter fristen; en ny tilmelding kan ikke oprettes. `/spil/pakkeleg?preview=1&registration=1` viser tilmeldingsskærmen som lokal simulation uden betaling.

Slag har et klientgenereret idempotens-id; terning og automatisk pakkevalg vælges på serveren med `randomInt`. Slag og pakkevalg kræver login. Offentlig GET viser bordet, men ingen hemmeligheder. Døgn og deadline valideres af serveren. Sidste juleevent beholdes i januar–oktober, så sene besøg stadig kan afslutte og afregne det.

Gaveåbning reserverer `openingAt` på pakken i global CAS. Wallet-CAS gemmer en permanent receipt i `parcelRewards` og en claim `parcel-open:<år>:<pakke>` for bananer. Derefter sættes `openedAt`, som tillader offentlig visning. Afbrudte åbninger repareres ved næste serverforespørgsel, også når de blev bestilt inden fristen, men afregnes efter. Hver fysisk præmie findes i ejerens permanente wallet-receipt. Push ved tyveri og afslutning (uden at afsløre indhold) har indstillingen Pakkeleg. Push forsøges kun efter committed ændring; fejlede pushes genforsøges ikke. Historikken viser de seneste 100 overdragelser, siden de seneste 15.

## Kontrol

`tests/parcel-game.test.mjs` tester tre slag gennem hele spillet, kl. 04, genafsendelser, selvtyveri, krav om at tømme midten, automatisk valg efter offlineperiode, skjult sluttid/indhold, afslutning, samtidige enheder i både Redis- og lokalt CAS samt enkelt udbetaling. Mobilvisningen er kontrolleret ved 390 px med simulationen.

Slutvisning til lokal test: `/spil/pakkeleg?preview=1&finished=1`. Ti fiktive deltagere, 20 gaver; ingen saldoændringer eller rigtige præmier.

Ikoner: `public/games/parcels/`, originale PNG og prompts i `docs/designs/parcel-rewards/`. Nye motiver lavet med built-in imagegen; øvrige juleikoner genbruges fra kalenderen. Alle er transparente WebP.

RTA-kop (18. november 2026, lokalt): én hvid kop med sort hank, sort inderside og sort RTA-logo. Én i pakkeleg + 50 bananer og én tilfældigt fordelt i julekalenderen + 50 bananer (samme deltagerfrist og udelukkelser som øvrige almindelige fysiske kalenderpræmier). Juleikon: `/games/advent/rta-mug-christmas-v2.webp`. Vinderen af krydsord #1 får også én kop oven i de 1000 bananer og badgen; særskilt ikon uden julepynt. Udlevering registreres i admin for hver aktivitet.

## Godkendte pushbeskeder 2026

Alle tider er dansk tid. Tobias Frost undtages fra disse beskeder, og notifikationsvalg respekteres.

| Tidspunkt | Modtagere | Besked | Link |
| --- | --- | --- | --- |
| 20/11 06.30 | Alle brugere | Nu begynder julen så småt i Stenbygaardland — Prøv dagens bokse og tilmeld dig pakkelegen. | `/spil/jul` |
| 21/11 08.00 | Ikke tilmeldte | Husk at tilmelde dig pakkelegen — Tilmeld dig inden den 27. november. | `/spil/pakkeleg` |
| 26/11 08.00 | Ikke tilmeldte | Sidste chance for at tilmelde sig pakkelegen i dag — Husk at tilmelde dig, hvis du vil være med. | `/spil/pakkeleg` |
| 27/11 06.30 | Tilmeldte | Så er det tid til pakkeleg — Se om du kan få indsamlet nogle gaver. | `/spil/pakkeleg` |
| 1/12 06.30 | Alle brugere | Så har julen for alvor ramt Stenbygaardland — Åbn første låge i julekalenderen nu. | `/spil/julekalender` |
| Når midten er tømt | Alle brugere | Alle pakker er taget fra bordet — Nu er det tid til at stjæle. | `/spil/pakkeleg` |

Planlægges automatisk på drift med QStash. Tilmelding afgøres ved afsendelsen. Status og opsætning ses under Admin → Julebeskeder. Lokal test og dev sender ingenting.

Lokalt tyveri-testbord: /spil/pakkeleg?preview=1&steal=1. Ti deltagere med tre gaver hver, tom midte, tre friske slag og knapper til test-sekser og nulstilling. Kun i Nuxt dev; ingen rigtige gaver, saldoændringer, API-slag eller push.

Nye indpakninger (lokalt, 19. november): svømmefødder, snorkel/briller, cykelhjul, cykelhjelm, Oakley-inspirerede løbesolbriller og bil. Nu 26 former; de første 20 beholder deres placering, og nye former vises fra gave 21. Oversigt: /preview/pakkeindpakninger (kun dev). Indpakning siger intet om præmien.

## Nytårsgave 2027 (lokalt, ikke udgivet)

Den 1. januar 2027 kl. 12 dansk tid sendes via den eksisterende QStash-planlægger: **Start året med en gave 🎁** — Godt nytår! Åbn appen i dag og få 500 bananer. Gaven kan hentes hele den 1. januar. Link: /spil/bananer. Almindelige sæsonpush-modtagerregler og valget Gaver respekteres; Tobias Frost er fortsat undtaget fra sæsonpush.

500 bananer gives én gang pr. konto ved autentificeret åbning/genoptagelse af appen på den danske kalenderdato 1. januar (00.00–23.59), uafhængigt af spillets kl. 04-nulstilling. Privat claim new-year:2027 og historik gemmes i samme wallet-CAS som saldoen. Offentlige saldovisninger, andres opslag og pushleveringen giver ingen gave. Kan hentes også før push kl. 12; notifikationstilladelse er ikke et krav. Lokal preview giver aldrig en rigtig gave uden den rigtige serverdato.

Juletema og aktive julespil slutter ved dansk midnat til 1. januar. Temaet genberegnes også i en allerede åben app og ved fokus/genoptagelse. Kalenderens server afviser nye lågeåbninger efter årsskiftet. Pakkelegens allerede lovede 14-dagesfrist til gaveafhentning efter spilslut bevares.
