# Spil og valuta — brainstorm

Opdateret 29. oktober 2026. Idéer til senere; spillene er ikke bestilt til implementering endnu.

## Valuta

- Valutaen hedder **bananer**.
- Spillene skal kunne give level-point med et loft, så stickers stadig vejer tungt. Beløb og pointregler er ikke fastlagt.

## Seneste afklaringer om casino, børs og lager

- Blackjack: brugeren ønsker 10–50 bananer i startindsats. Split/double kan give større samlet indsats.
- Slots hedder **Bananditten**. Forslaget var 94 % RTP; brugeren overvejer 90 %, men det giver større forventet tab (10 frem for 6 pr. 100 satsede). Endelig tilbagebetaling afklares inden implementering.
- Lykkehjulet er et gratis dagligt spin med bananer eller nitte. Badges for samlet antal spins, jackpot **og streak**. Foreslået streak: 3/7/14/30/100 dage, regnet efter kalenderdage i Europe/Copenhagen.
- Aktier skal ændre kurs hvert minut, tilfældigt uden events fra appen. Markedet skal fortsætte uden besøgende og kunne vise en graf over de seneste **72 timer** (4.320 minutintervaller). Manglende minutter kan beregnes efterfølgende på serveren, så man ikke behøver et cron-job hvert minut. Brugeren spørger til kurser uden loft; modellen er endnu ikke valgt.
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
