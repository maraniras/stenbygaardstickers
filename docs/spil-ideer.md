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
- **Kursmodel**: brugeren foretrækker en fast grundkurs og ønsker ikke ustyrlig/uendelig vækst. Kurser skal normalt ligge over 0 og op til ca. 250, sjældent nå omkring 1.000 og kunne gå højere i ekstraordinære tilfælde. Tilbagevenden mod grundkursen skal blive stærkere ved meget høje kurser. Præcis kalibrering og et eventuelt absolut loft er ikke vedtaget; et sikkerhedsloft på fx 2.500 er et forslag. En kurs på præcis 0 undgås i en multiplikativ model, så aktien ikke låses der permanent. Simulér fordelingen og varigheden af høje kurser før implementering; 1.000 er en sjælden top, ikke et mål eller en garanti.
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
