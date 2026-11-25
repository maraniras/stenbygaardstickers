# Sammenligning af forbedrede aktiemodeller

Kørt 25. november 2026 på arbejdsbranchen til version 3.0. Der er ikke aktiveret handel eller ændret noget på drift.

## Forsøgsopstilling

- Fem på forhånd fastlagte varianter på de samme 200 tilfældige markedsforløb med 20 oprindelige startpriser/risikoklasser. 4.000 aktieår pr. variant, 20.000 aktieår samlet. Varianterne er parrede; det er ikke 1.000 uafhængige markeder.
- To seed-batches, 20261126 og 20261127, med 100 markeder hver. Andet batch er hold-out. Ingen parametre blev ændret efter at have set resultaterne.
- 365 døgn og 525.600 minuttrin. Ingen app-events, lån, shorting eller ekstra indbetalinger. Startpris er ikke et fremtidigt kursmål.
- Gratis køb; 5 % af positiv realiseret gevinst ved salg. Tab giver ikke refusion af tidligere gebyrer. Brøkaktier tillades i analysen.
- Portefølje: 1.000 bananer ligeligt fordelt i bananer over alle 20 aktier, køb minut 1, ingen rebalancering, sælg ved årets slutning. Gebyr opgøres pr. aktie, uden modregning af andre aktiers tab.
- De aktive strategier har hver en selvstændig startpung på 1.000 pr. aktie. Signaler hvert 10. minut udføres til næste minuts kurs. Ingen fremtidige kurser eller skjulte regimer gives til strategierne. Tilfældig eksponering vælger dagligt at være inde/ude uafhængigt af kursdata.
- Enkeltaktiers min/max og største fald er målt hvert minut. Porteføljers største fald er målt på daglig værdi efter hypotetisk salgsgebyr.
- Motorkontrol: Numba-afvikling mod fortolket Python på samme to døgn og seed; alle returnerede arrays stemte inden for 1e-9 relativ tolerance. Gevinstgebyr kontrolleret separat. Supplerende målinger af korte vinduer gav præcis uændrede årsresultater.

## Parametre og varianter

1. **Nuværende:** daglig grundstøj 2/4/7,2 %, tilføjet vækstkomponent 8/15/25 % årligt.
2. **Lavere udsving:** støj 1,2/2,2/3,5 %, samme vækst som før. Resten uændret for at isolere støjændringen.
3. **Justeret vækst:** samme lavere støj, men vækstdrift = 90 % rolig + 10 % urolig støjkorrektion plus `ln(1.05)/525600` pr. minut. Den ekstra komponent svarer isoleret til ca. 8,15/15,97/35,03 % årligt, ikke blot 5 %. Den nominelle 5 %-retning for log-kurs er ikke garanteret afkast eller en garanti om lav valutauddeling.
4. **Fælles markedsstøj:** variant 3 plus 30 % fælles varians i støjen, `sqrt(0.7)*individuel + sqrt(0.3)*fælles`, med samme marginale normalfordeling. Regimer er fortsat individuelle. Målt gennemsnitlig parvis korrelation i dagsafkast: 26,7 %, mod omtrent nul uden fælles faktor.
5. **Bløde trendskift:** variant 4 plus eksponentiel udglatning af trendens log-drift med 15 minutters tidskonstant. Det udglatter ikke selve den tilfældige støj.

Alle varianter bevarer ±2/4/7 % daglig regime-drift, regimer på 30–180 minutter med sandsynligheder 50/20/20/10 %, urolig støj ×1,5, blød modstand over 250 og loft 2.500. Støj klippes til ±0,01 i log-kurs; den samlede bevægelse har også øvrige komponenter og er ikke præcist begrænset til 1 %.

## Samlede resultater

| Variant | Median enkeltaktie efter gebyr | Aktier med mindst 50 % kurstab | Median portefølje efter gebyr | Porteføljer i plus | Gennemsnit portefølje efter gebyr |
| --- | --- | --- | --- | --- | --- |
| Nuværende | -18,8 % | 30,0 % | +3,8 % | 56,0 % | +9,7 % |
| Lavere udsving | +3,5 % | 8,4 % | +14,1 % | 86,5 % | +16,3 % |
| Lavere udsving + justeret vækst | +5,3 % | 7,3 % | +17,7 % | 90,5 % | +20,1 % |
| Også fælles markedsstøj | +6,5 % | 7,1 % | +18,6 % | 66,0 % | +22,8 % |
| Også bløde trendskift | +6,5 % | 7,1 % | +18,6 % | 66,0 % | +22,8 % |

Median enkeltaktie er nettoafkast ved køb minut 1 og slutlikvidation. Kolonnen om halvering er kurs ved årets slutning mod den oprindelige startpris; den måler ikke midlertidige fald undervejs. Ingen varianter er risikofri.

## Risikoklasser

| Variant | Lav risiko: median netto | Mellem risiko: median netto | Høj risiko: median netto |
| --- | --- | --- | --- |
| Nuværende | -1,9 % | -16,0 % | -54,5 % |
| Lavere udsving | +4,3 % | +4,1 % | +0,5 % |
| Lavere udsving + justeret vækst | +4,4 % | +5,0 % | +8,1 % |
| Også fælles markedsstøj | +4,8 % | +6,8 % | +9,6 % |
| Også bløde trendskift | +4,8 % | +6,8 % | +9,6 % |

I den nuværende model sluttede 52,5 % af højrisikoaktierne mindst halveret. Med fælles markedsstøj var andelen 15,7 %. Median største fald for alle enkeltaktier faldt fra cirka 66,2 % til 40,6 %; der er stadig væsentlige midlertidige tab.

## Porteføljer, udsving og banantilførsel

| Variant | 5. / 50. / 95. percentil for nettoårsafkast | 95 % bootstrapinterval for gennemsnit | Median største fald undervejs |
| --- | --- | --- | --- |
| Nuværende | -27,2 % / +3,8 % / +59,7 % | +4,4 % til +16,6 % | -25,7 % |
| Lavere udsving | -5,5 % / +14,1 % / +46,1 % | +14,2 % til +18,7 % | -9,6 % |
| Lavere udsving + justeret vækst | -3,0 % / +17,7 % / +51,4 % | +17,8 % til +22,5 % | -9,2 % |
| Også fælles markedsstøj | -24,9 % / +18,6 % / +100,0 % | +17,8 % til +28,0 % | -22,4 % |
| Også bløde trendskift | -24,9 % / +18,6 % / +99,9 % | +17,8 % til +28,0 % | -22,4 % |

Fælles bevægelser reducerede andelen af spredte porteføljer i plus fra 90,5 % til 66,0 % i forsøget. Det var ikke et fald i det observerede gennemsnitsafkast; gennemsnittet steg fra 20,1 % til 22,8 %. Bootstrapintervallerne overlapper, så testen viser ikke, at fælles støj i sig selv øger det forventede afkast. Den tiltænkte effekt er mere fælles risiko, ikke mere vækst.

Med fælles markedsstøj blev 1.000 startbananer til cirka 1.186 i median og 1.228 i gennemsnit efter et år, inklusive gebyr. Omtrent 34 % af porteføljerne sluttede i minus. For større formuer skalerer beløbene, så valutauddeling skal stadig vurderes i den samlede appøkonomi. 200 markeder er en stikprøve; plusandele er observerede andele, ikke præcise fremtidige sandsynligheder.

## Korte kursbevægelser

Median absolut bevægelse med justeret vækst og fælles markedsstøj:

| Horisont | Lav risiko | Mellem risiko | Høj risiko |
| --- | --- | --- | --- |
| 1 time | 0,2 % | 0,3 % | 0,5 % |
| 3 timer | 0,3 % | 0,6 % | 0,9 % |
| 1 døgn | 0,9 % | 1,6 % | 2,6 % |

Et vindue af hver længde blev målt ved slutningen af hvert spildøgn i alle forløb. Horisonterne overlapper indbyrdes, og aktier i samme marked er korrelerede. Tallene viser, at der stadig er bevægelse intradag; om det opleves spændende i appen er en designvurdering.

## Simple handelsstrategier

Median nettoårsafkast på tværs af enkeltaktie-punge:

| Variant | Køb og behold | Tilfældig daglig eksponering | Momentum | Gammel dip-strategi |
| --- | --- | --- | --- | --- |
| Nuværende | -18,8 % | -21,8 % | -18,9 % | 0,0 % |
| Lavere udsving | +3,5 % | -6,4 % | +10,8 % | 0,0 % |
| Lavere udsving + justeret vækst | +5,3 % | -5,6 % | +11,8 % | 0,0 % |
| Også fælles markedsstøj | +6,5 % | -5,1 % | +12,4 % | 0,0 % |
| Også bløde trendskift | +6,5 % | -5,2 % | +12,9 % | 0,0 % |

Den gamle dip-strategi køber under 80 % af startprisen og sælger ved startprisen, ellers slutlikvideres der. Momentum køber efter mere end 1 % stigning over den seneste time og sælger efter mere end 1 % fald over en time. I den fulde nye variant endte ca. 65,5 % af momentumpungene i plus og medianen var +12,9 %. Det er stadig et stærkt simpelt signal, men ingen risikofri eller næsten altid vindende strategi i disse forsøg. Fire strategier er ikke et bevis for fravær af andre stærke strategier.

## Vurdering og resterende spørgsmål

- Lavere grundstøj løser meget af problemet med langsom udhuling. Justeret vækst forbedrer især højrisikoaktiers typiske resultat.
- Uden fælles faktor bliver spredning meget effektiv: over 90 % af porteføljerne ender i plus. Fælles markedsstøj giver mere reel risiko også ved at købe alle aktier.
- Blødere trendskift ændrer næsten ikke årsfordelingerne; de er primært et muligt visuelt/oplevelsesmæssigt valg. Momentum bliver lidt stærkere med denne udglatning.
- Anbefalet næste kandidat er **lavere støj + justeret vækst + fælles markedsstøj**. Det er en anbefaling til videre arbejde, ikke automatisk produktionsgodkendelse.
- Den observerede gennemsnitlige banantilførsel er højere end i den nuværende model. Det skal afstemmes med ønsket økonomi, handelsgrænser og brugerformuer, før markedet åbnes.
- Ingen af de 4.000 aktieforløb pr. variant ramte loftet. Den fælles variant nåede maksimalt ca. 549 bananer. Det tidligere ønske om sjældne kurser omkring 1.000 er dermed ikke demonstreret i denne prøve; mere støj alene er ikke nødvendigvis den rigtige løsning.
- Resultaternes styrke går igen i begge seed-batches, men sjældne udfald og andre handelsstrategier kræver videre undersøgelse. Fælles støj er kun én type markedsfaktor; vi har ikke tilføjet fælles trendregimer.

## Filer og genkørsel

- [Resultater i CSV](results-20261125.csv)
- [Resultater, parametre, batchkontrol og to eksempelårs kurver i JSON](results-20261125.json)
- [Simulationsmotor](compare.py)

Python, NumPy og Numba kræves. Kør fra repoets rod:

```sh
python docs/experiments/market-improvements/compare.py --markets-per-seed 100 --workers 8 --out .data/market-improvements-new.json
```

Filnavnets dato er forsøgets dato, ikke begyndelsen på et virkeligt markedsår. Tilfældighedsgeneratoren er MT19937 med separate seedede markeder; den genskaber ikke den tidligere PCG64-eksempelsimulerings nøjagtige kurskurve, selv hvis seed-tallet genbruges. Alle fem varianter bruger derimod parrede strømme inden for dette forsøg.
