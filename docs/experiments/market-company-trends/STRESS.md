# Års- og handelstest

Testen sammenligner tre parrede varianter: uden virksomhedsperioder, den hidtidige styrke log(1,5)/30 pr. rigtig dag og en svagere styrke log(1,25)/30. Alle beholder månedstempo, grundvækst, risikoklasser, 7–28-dages tilstande, to dages glatning, øvre modstand og loft.

Pilot: 60 markeder fra seed 20261210 + i × 1009. En efterfølgende kontrolrunde bruger andre seeds. Et marked har 20 aktier, og hver variant simuleres i 365 rigtige dage med alle virtuelle minutovergange bevaret.

Der testes seks strategier: behold, tilfældig daglig eksponering, momentum over en time, momentum over en uge, køb under 80 % af startkurs og sælg ved startkurs samt køb under 200/sælg ved 250 for at undersøge modstanden. Beslutninger træffes hver time og eksekveres til kursen et rigtigt minut senere, afrundet til nærmeste virtuelle minut. Ugens strategi måler kun tidligere syv dage. Der bruges ingen skjulte virksomhedstilstande eller fremtidige priser.

Hver strategi starter med 20 separate puljer à 50 bananer, kan være kontant eller købe fraktionelle aktier, geninvesterer egne provenuer og flytter ikke penge mellem aktier. Der er ingen shorting, lån, nye indbetalinger eller markedspåvirkning. Salg koster 5 % af positiv realiseret gevinst; tab er gebyrfri. Afsluttende positioner værdiansættes efter hypotetisk salgsgebyr. Behold-strategien køber efter første minut; de øvrige kursmålinger bruger startkursen ved minut nul. Denne lille forskel er tilsigtet og kontrolleret.

Prisbaner er parrede på tværs af modeller, og tilstande har en separat RNG. Kontroller omfatter kendt gevinst/gebyr, tab uden gebyr, uændrede kurser, faktisk brug af eksekveringskursen og fuld afstemning af behold-strategiens resultat med direkte slutlikvidation.

Begrænsninger: Kun de seks beskrevne strategier og én beslutningsfrekvens. Resultater kan ikke udelukke andre strategier, bedre parametre, handel tæt ved loftet eller fremtidige API-fejl. Overlappende 30/90-dages vinduer er afhængige og tæller ikke som selvstændige markedstests. Største porteføljefald i handelstesten måles dagligt og kan undervurdere fald inden for dagen.

Pilotens første kørsel målte 30-dagesafkast som ændring i en allerede ejet porteføljes likvidationsværdi. Kontrolrundens definition er rettet til en ny ligeligt fordelt investering i hvert 30-dagesvindue med korrekt nyt anskaffelsesgrundlag. Pilotens månedstal bruges derfor ikke til at sammenligne det oprindelige mål for månedligt investeringsafkast.

## Pilot og uafhængig kontrol

60 pilotmarkeder og 60 nye kontrolmarkeder bekræfter forskellen i den simple ugestrategi. I kontrolrunden gav den overskud i 95 % af markederne med stærke virksomhedsperioder, mod 81,67 % med svagere perioder og 78,33 % uden. Det er porteføljer fordelt på 20 aktier, ikke sandsynligheden for en enkelt handel. Ugestrategiens medianafkast var henholdsvis +109,31 %, +60,46 % og +49,88 % efter et rigtigt år.

Strategien køb under 200/sælg ved 250 slog behold i 96,67 % af kontrolmarkederne i alle tre varianter. Det er et advarselstegn om den prisbestemte modstand, ikke et bevis for en tabsfri strategi. I varianten med svagere perioder havde denne strategi et typisk største dagligt målt porteføljefald på 50,69 %.

Derfor testes en yderligere kandidat med svagere virksomhedsperioder og helt uden den faste modstand over 250 og det faste loft på 2.500. Sidste runde har 60 nye seeds fra 20270210 + i × 1009 og sammenligner denne kandidat parret med begge trendstyrker under de gamle kursregler. Grundvæksten ændres ikke.

## Resultat og valgt kandidat

Alle tre runder er afsluttet: 180 forskellige markeder, hver med 20 aktier, tre parrede varianter og seks strategier. 10.800 simulerede aktieårsforløb i alt, men ikke 10.800 uafhængige markeder. Filer: `stress-pilot-20261125.json`, `stress-validation-20261125.json`, `stress-final-20261125.json`.

Ny simulationskandidat er `company25NoPriceAnchor`, fastholdt i `candidate-settings.json`. Virksomhedsperiodernes styrke sænkes fra log(1,5)/30 til log(1,25)/30 pr. rigtig dag. Varigheder og glatning beholdes. Fast kursmodstand og fast loft fjernes; der indføres ingen tilbagevenden til startkurs. Risiko, vækst og gebyr er uændrede. `year.py` bruger nu denne kandidat som standard; `--variant legacy` reproducerer det tidligere årseksempel uden at ændre den gamle graf.

Sidste runde på 60 nye markeder:

| Måling | Stærke trends, gamle kursregler | Svagere trends, gamle regler | Svagere trends, ingen kursgrænse |
|---|---:|---:|---:|
| Køb under 200/sælg ved 250 slår behold | 93,33 % | 93,33 % | 36,67 % |
| Ugestrategi slår behold | 30,00 % | 20,00 % | 11,67 % |
| Enkeltaktier slutter året i minus | 39,08 % | 38,17 % | 36,08 % |
| Median længste periode under startkurs | 72 dage | 67 dage | 63 dage |
| Gennemsnitligt frisk 30-dagesafkast, spredt investering | +16,34 % | +15,40 % | +19,53 % |
| Median årligt nettoafkast, spredt investering | +159,35 % | +154,41 % | +369,69 % |

Den valgte kandidats 5/50/95-percentiler for 30-dagesafkast er −25,50 / +14,32 / +82,45 %. 31,75 % af de overlappende månedsvinduer gav tab. 95,92 % af enkeltaktierne oplevede mindst ét 90-dagesfald på mere end 20 % i løbet af året; det er ikke ensbetydende med et uafbrudt fald hver dag. 6,67 % af de spredte årsporteføljer sluttede i minus. Medianen for ugestrategiens største dagligt målte porteføljefald var 39,23 %.

Vigtig afvejning: Uden prisankeret opstår en meget skæv højre hale. Største observerede nominelle aktiekurs var 1.806.337,68. Gennemsnitligt årsafkast for en spredt portefølje var +2.453,27 %, langt over medianens +369,69 %. Dette viser sjældne meget store vindere og er ikke et forventet, sikkert afkast for en spiller. Lav/mellem/høj havde årlige medianafkast pr. aktie på cirka +69 / +109 / +21 %, mens deres 5-percentiler var cirka −59 / −84 / −98 %. Høj risiko giver større udfald, ikke et højere sikkert afkast.

Valget fjerner en konkret konstateret skævhed, men ingen test dokumenterer, at alle mulige strategier er uden fordel. Prisniveauer og store gevinsthaler skal fortsat indgå i gameplay-vurderingen. Ingen handelsmotor, Redis-skrivninger, saldi eller produktionsindstillinger ændres af simulationsvalget.
