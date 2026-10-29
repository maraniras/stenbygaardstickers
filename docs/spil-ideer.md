# Spil og valuta — brainstorm

Opdateret 29. oktober 2026. Idéer til senere; spillene er ikke bestilt til implementering endnu.

## Valuta

- Valutaen hedder **bananer**.
- Spillene skal kunne give level-point med et loft, så stickers stadig vejer tungt. Beløb og pointregler er ikke fastlagt.

## Seneste afklaringer om casino, børs og lager

- Blackjack: brugeren ønsker 10–50 bananer i startindsats. Split/double kan give større samlet indsats.
- Slots hedder **Bananditten**. Brugeren har valgt **96 % RTP**. Præmier/sandsynligheder skal tilpasses dette, før spillet bygges.
- Lykkehjulet er et gratis dagligt spin med bananer eller nitte. Badges for samlet antal spins, jackpot **og streak**. Foreslået streak: 3/7/14/30/100 dage.
- **Dagsgrænse kl. 04.00 dansk tid (Europe/Copenhagen)** for daglige spil og streaks, også ved sommer-/vintertid. Et spildøgn går fra kl. 04.00 til næste kl. 04.00. En streak fortsætter ved aktivitet i næste spildøgn og brydes først, når et helt spildøgn springes over; optjente badges og bedste streak bevares.
- Aktier skal ændre kurs hvert minut, tilfældigt uden events fra appen. Markedet skal fortsætte uden besøgende og kunne vise en graf over de seneste **72 timer** (4.320 minutintervaller). Grafvalg: **1, 2, 3, 6, 24 og 72 timer**. Manglende minutter kan beregnes efterfølgende på serveren, så man ikke behøver et cron-job hvert minut.
- **Kursmodel**: brugeren foretrækker en fast grundkurs og ønsker ikke ustyrlig/uendelig vækst. Startkurser 1–100 bananer med uafhængig lav/mellem/høj risiko. Kurser skal normalt ligge over 0 og op til ca. 250, sjældent nå omkring 1.000 og kunne gå højere i ekstraordinære tilfælde. Brugeren har valgt et absolut sikkerhedsloft på **2.500**. Intet fast minimum: multiplikative kurser kan nærme sig nul uden at ramme nul. Præcis model/kalibrering er ikke godkendt endnu; se testresultater nedenfor.
- Bananlageret på profilen skal have flere visuelle trin; en voksende bunke bananer kan give mellemtrin mellem hylde, kasser, skur og stort lager. Brugeren kan lide mørkt udseende.
- Forslag til opdeling i samme app: topvalg Stickers/Bananland med hver sin bundmenu, fælles konto/profil. Brugeren har endnu ikke bestilt denne opdeling.

## Dagligt geografispil: Emil er faret vild

- En fiktiv sticker placeres ved en hovedstad. Man ser et luftfoto uden stednavne.
- Seks hovedstæder som svarmuligheder; de samme knapper hele runden.
- Fem gæt. Efter et forkert gæt fjernes den valgmulighed, og luftfotoet zoomer længere ud.
- Alle får samme dagsopgave. Forsøg og belønning skal knyttes til brugeren.
- Brugeren ønsker, at en by ikke optræder som svarmulighed igen de næste 20 dage.
- Forslaget er, at pausen gælder alle seks byer, både korrekt svar og distraktorer; det kræver mindst 126 byer i en daglig rotation.
- Man vinder bananer for korrekt svar og flere for færre gæt.
- Foreslået, endnu ikke fastlagt: 100 / 75 / 50 / 30 / 15 bananer ved korrekt svar på gæt 1–5; 0 ved tab. Ingen betaling for forkerte gæt.
- Seneste forslag er hjælp alene gennem udzoomning; afstand og retning var en tidligere mulighed.
- Luftfoto-eksempel med Rom viste ca. 0,8 / 4 / 20 / 100 / 500 km på tværs.

## Pil en sticker

- Inspireret af brugerens tidligere Daily Jegg.
- Tolv skjulte stickers på en lygtepæl; vælg tre og afslør præmier eller tab.
- Mulige udfald: bananer, gangebonus, Emil-skrig-jackpot og Mikkels knæ som tab.
- Ét spil dagligt, eventuelt streak-bonus. Regler er ikke fastlagt.

## Emiljack og øvrige idéer

- Blackjack med Emil som dealer, vennerne som billedkort og eventuelt et særligt Emil-kort.
- Fiktive væddemål om næste stickers land, kontinent eller hvem der sætter den op; kan afgøres ved godkendelse.
- Kosmetik og spilbadges som mulige anvendelser af valuta og aktivitet.

## Markedstest 29. oktober 2026 — modellen er ikke klar til implementering

- Prototype: log-kurs med grundkurstiltrækning (halveringstid 12/24/36 dage), basal daglig støj 5/10/18 % efter risiko, tilfældige regimer på 30–180 minutter (rolig/medvind/modvind/urolig = 50/20/20/10 %). Med-/modvind har log-drift ±10/20/35 % pr. døgn fordelt på minutter; urolig støj ×1,5. Maksimal log-bevægelse pr. minut ±0,01, ekstra negativ log-drift `0.02 * max(ln(kurs/250), 0)^2` pr. døgn, loft 2.500. Disse parametre er afprøvede forslag, ikke vedtagne produktregler.
- Første langtidstest: ét konkret marked med 20 aktier plus 100 ekstra markeder, 2.000 aktieår. Beregnet hvert minut. Maksimum i det konkrete marked 570,45; maksimum i ekstra markeder 2.375,53. 2,3 % af de ekstra aktieforløb nåede 1.000 mindst én gang; ingen ramte 2.500. Udfald er ikke garantier eller en test af handelsøkonomien.
- Opfølgende handelstest med ny seed 20261031: 100 markeder/2.000 aktieår, alle med selvstændig startpung på 1.000 bananer pr. aktie. Brøkaktier, ingen lån/shorts/indbetalinger. Beslutninger hvert 10. minut eksekveres til næste minuts kurs; køb-og-behold og daglig tilfældig eksponering er benchmarks. Slutlikvidation og både købs-/salgsgebyr tæller, også ved tab. Gebyrer 0/0,25/0,5 % pr. side. Ingen fremtidige kurser eller skjulte regimeskift tilgængelige for strategierne.
- Korte perioder: 200 tilfældigt udvalgte slutminutter pr. horisont efter dag 30, på tværs af alle forløb. Vinduer kan overlappe og er ikke uafhængige observationer. Median absolut kursændring for lav/mellem/høj risiko: 10 min = 0,29/0,59/1,02 %; 1 time = 0,74/1,48/2,54 %; 3 timer = 1,32/2,60/4,49 %; 24 timer = 3,71/7,48/12,81 %. Der er allerede tydelig kortsigtet bevægelse.
- **Balanceproblem med fast grundkurs**: køb under 80 % af grundkursen, sælg ved grundkursen, ellers behold til testslut. Median årsafkast efter 0,25 % gebyr pr. side = +144,8/+411,2/+980,7 % (lav/mellem/høj); 99,7/99,7/98,7 % af startpungene endte i plus. Store midlertidige tab forekommer; dette er ikke risikofrit. En variant med 30 % stop-loss og højst 30 dages ejertid løste ikke problemet. 0,5 % gebyr pr. side reducerede kun medianerne til +140,0/+393,0/+923,5 %.
- **Meget hyppig handel straffes hårdt**: køb efter +1 % over sidste time og sælg efter -1 % over sidste time gav ca. 1.418/2.361/3.009 afsluttede handler pr. år (median). Med 0,25 % gebyr pr. side var median årsafkast -99,7/næsten -100/næsten -100 %. Uden gebyr var medianerne positive. Det beviser ikke, at enhver aktiv strategi taber, men gebyret skal passe til det ønskede spiltempo.
- Eksperimentel variant med **flyttende balancepunkt**, ikke godkendt: 50 markeder/1.000 aktieår. Balancepunktets log-kurs vandrer tilfældigt med basal daglig støj 4/7/10 % og trækkes tilbage til den oprindelige grundkurs med halveringstid 365 dage; resten af kursmodellen uændret. Den samme køb-under-80 %-strategi gav median årsafkast +32,8/+151,0/+421,9 % og 75,7/85,4/85,7 % startpunge i plus. Det dæmper problemet, men er stadig en stærk, simpel strategi. Sammenligningen bruger forskellige antal tilfældige forløb, ikke et parret forsøg.
- Konklusion: mere støj er ikke næste skridt. Test af kurser alene er ikke tilstrækkelig; ret modellen for det oplagte købssignal og afstem gebyr/spiltempo, før den samlede bananøkonomi fastlægges. Ingen aktiehandel er bygget i appen endnu.
