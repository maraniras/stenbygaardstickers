# Pakkeleg – første version

Lokalt spil på `/spil/pakkeleg`. Isoleret simulation på `/spil/pakkeleg?preview=1`, kun med Nuxt dev: ingen API-slag, saldoændringer eller push. Link på Spil-siden. Ikke publiceret.

## Regler

- Tilmelding 20. november kl. 04 til og med 26. november kl. 23.59 dansk tid. Pris 100 bananer pr. bruger. Ingen eftertilmelding.
- Spillet starter 27. november kl. 04 dansk tid. To slag pr. tilmeldt bruger pr. spildøgn, nulstilling kl. 04; ingen opsparing.
- Kun seksere giver pakkevalg. 60 sekunder, ellers automatisk valg. Serveren behandler udløbne valg inden næste handling, også efter offlineperioder.
- Tag fra midten først. Når midten er tom, vælger man en anden brugers pakke. Egne pakker kan ikke vælges.
- Kun betalende tilmeldte brugere er med. 2 gaver pr. deltager: 7 deltagere giver 14 gaver. Andre kan se bordet som tilskuere.
- Fast udseende og nummer pr. pakke. Sluttidspunktet er hemmeligt til afslutningen. Indholdet er hemmeligt for alle, inklusive ejeren, indtil ejeren selv åbner pakken.
- Slut trækkes kryptografisk én gang i intervallet 25. december kl. 00 til 31. december kl. 23.59.59, dansk tid. Når tiden er gået, låses ejerskab. Afslutningen beregnes ved næste serverforespørgsel. Ejerskab låses, men ingen uåbnede præmier udbetales automatisk.
- Én Mix Max + 50 (to ved mindst 12 deltagere/24 gaver), én fysisk gave med træstammer + 50, én Faxe Kondi-flaske + 50, én eksklusiv profilramme, én gylden gave med 500 og mindst to drillenisser med 1 banan hver (15 % rundet op). Ved 12+ gaver også to separate drikkedunksgaver med en drikkedunk + 50 bananer hver og én RTA-snekugle + 50. Resten er 25/50/100/150/250 fordelt efter vægt 3/3/2/2/2. Med 10 deltagere: 20 gaver og 1.703 bananer, plus de øvrige præmier.
- Minimum fire deltagere for at kunne rumme de faste præmier; ellers aflyses og 100 bananer refunderes én gang til hver tilmeldt.
- Gaverne fordeles tilfældigt på indpakningerne én gang ved spilstart efter tilmelding.
- Efter slut har ejerne præcis 14 dage til at åbne egne gaver. Andre ser først indhold og beløb efter åbning. Personkort summerer kun åbnede bananer, fysiske præmier og profilramme. Efter fristen skjules kortet på Spil, og pakkelegsiden viser afsluttet status. Uåbnede gaver bliver ikke automatisk udbetalt.
- Profilrammen gemmes som kosmetisk ejendel og sættes på vinderens avatar ved åbning.
- Julekalenderens personlige gaver holdes adskilt.
- x103 hedder Pakkelegs Champ 2026 og går til én samlet vinder: flest ejede gaver ved slut, derefter flest bananer i disse gaver (åbnede såvel som uåbnede), derefter først nået det endelige gaveantal. Fysisk værdi, startsaldo, gebyr og badgebonus tæller ikke. Første opnåelse gemmes varigt på bordet, uafhængigt af den korte aktivitetshistorik; ved identiske tidsstempler bruges serverens rækkefølge. Badgen kræver ikke fem gaver og giver fortsat 1 point/20 bananer én gang. Gavegrådig kræver fortsat tre gaver.

## Lagring og sikkerhed

Admin → Pakkeleg (`/admin/pakkeleg`) viser de fysiske præmier pr. år efter afslutningen: endelig vinder, pakkenummer, åbning og udleveringsdato. Samme vinder kan have flere rækker; en gave tilbage på fællesbordet står uden vinder. Før afslutning afsløres ingen indhold eller vindere. Læsning opretter/afslutter aldrig et spil og udbetaler intet.

En åbnet fysisk præmie kan markeres som udleveret eller sættes tilbage til afventer. Dato gemmes i den eksisterende private `parcelRewards`-kvittering under wallet-CAS. Gentagne klik bevarer første dato, og udlevering ændrer ikke saldo, ejerskab eller præmieindhold. API kræver adminlogin og slår selv vinderen op ud fra gave-id. `/admin/pakkeleg?preview=1` er en lokal UI-simulation med fiktive rækker; knapperne kalder ikke API'et.

Redis-hash `parcel-games-v2` med år som felt; den tidligere gratis prototype er bevaret separat og bruges ikke. Global compare-and-set beskytter terninger, daglige grænser, ejerskab og udløbne valg samlet. Lokalt en serialiseret Nitro-storage-kø. Preview bruger den eksisterende `dev:`-isolering. Tilstand medtages i adminbackup.

Betaling og permanent claim `parcel-entry:<år>` gemmes atomisk i wallet-CAS. Serveren genskaber deltagerlisten ud fra disse kvitteringer, også ved afbrudt forbindelse mellem betaling og opdatering af bordet. Gentagne forsøg trækker ikke igen. En allerede betalt kvittering kan genoptages efter fristen; en ny tilmelding kan ikke oprettes. `/spil/pakkeleg?preview=1&registration=1` viser tilmeldingsskærmen som lokal simulation uden betaling.

Slag har et klientgenereret idempotens-id; terning og automatisk pakkevalg vælges på serveren med `randomInt`. Slag og pakkevalg kræver login. Offentlig GET viser bordet, men ingen hemmeligheder. Døgn og deadline valideres af serveren. Sidste juleevent beholdes i januar–oktober, så sene besøg stadig kan afslutte og afregne det.

Gaveåbning reserverer `openingAt` på pakken i global CAS. Wallet-CAS gemmer en permanent receipt i `parcelRewards` og en claim `parcel-open:<år>:<pakke>` for bananer. Derefter sættes `openedAt`, som tillader offentlig visning. Afbrudte åbninger repareres ved næste serverforespørgsel, også når de blev bestilt inden fristen, men afregnes efter. Hver fysisk præmie findes i ejerens permanente wallet-receipt. Push ved tyveri og afslutning (uden at afsløre indhold) har indstillingen Pakkeleg. Push forsøges kun efter committed ændring; fejlede pushes genforsøges ikke. Historikken viser de seneste 100 overdragelser, siden de seneste 15.

## Kontrol

`tests/parcel-game.test.mjs` tester to slag, kl. 04, genafsendelser, selvtyveri, krav om at tømme midten, automatisk valg efter offlineperiode, skjult sluttid/indhold, afslutning, samtidige enheder i både Redis- og lokalt CAS samt enkelt udbetaling. Mobilvisningen er kontrolleret ved 390 px med simulationen.

Slutvisning til lokal test: `/spil/pakkeleg?preview=1&finished=1`. Ti fiktive deltagere, 20 gaver; ingen saldoændringer eller rigtige præmier.

Ikoner: `public/games/parcels/`, originale PNG og prompts i `docs/designs/parcel-rewards/`. Nye motiver lavet med built-in imagegen; øvrige juleikoner genbruges fra kalenderen. Alle er transparente WebP.
