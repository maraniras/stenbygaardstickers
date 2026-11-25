# Hurtigere marked: fra årsafkast til månedsafkast

Testet 25. november 2026 på 3.0-branchen. Formålet er et sjovere spilmarked over dage og uger med cirka 23 % månedligt gennemsnitsafkast som pejlemærke, ikke et lovet afkast eller et loft. Der er ikke ændret noget på drift eller aktiveret handel.

## Metode og kontrol

- De samme 20 oprindelige aktier, startpriser og risikoklasser som i de tidligere forsøg.
- Kandidaten med lavere støj, justeret vækst og 30 % fælles støjvarians. Ingen fast grundkurstiltrækning, blød modstand over 250 og loft 2.500.
- Tiden komprimeres ved at afvikle alle originale virtuelle minuttrin. Dermed accelereres vækst, støj, regimer, støjkorrektion og øvre modstand sammen. `365/30` virtuelle dage pr. virkelig dag gør et tidligere simuleret år til præcis 30 virkelige dage. Det er ikke en simpel multiplikation af et årsafkast eller en upræcis opskalering af minutstøj.
- Kurserne vurderes ved de tilsvarende virkelige døgnskel. Appens fremtidige synlige minutkurser vil være stikprøver af den virtuelle tidsakse. Interne kurstoppe mellem to synlige kurser er ikke automatisk tilgængelige handelskurser.
- Gratis køb; 5 % af positiv realiseret gevinst ved hypotetisk salg ved periodens slutning. Gebyr beregnes pr. aktie uden modregning af andre aktiers tab.
- Portefølje: 1.000 bananer ligeligt fordelt i bananer på alle 20 aktier til startkursen. Ingen rebalancering eller ekstra indbetalinger. Ved 1 dag, 7 dage, 30 dage og 90 dage vurderes hver periode som en separat hypotetisk slutlikvidation. Der sælges ikke løbende og genkøbes i kurven.
- De kortere tidshorisonter og forskellige risikovarianter er parrede på samme tilfældige forløb. Data på 1, 7, 30 og 90 dage fra samme forløb er ikke uafhængige observationer.
- Numerisk kontrol mod almindelig Python og mod den tidligere NumBa-motors normalmodel på samme seed: både kurser, toppe og største fald stemmer inden for den angivne 1e-9 relative tolerance.
- Risiko og gennemsnit er estimeret på markedsniveau. Bootstrapintervaller for gennemsnittet resampler hele markeder, så de fælles aktiebevægelser ikke tælles som uafhængige aktier.

## Første runde: syv på forhånd valgte kombinationer

To seeds, 20261128 og 20261129, hver med 100 markeder. 200 forløb med 20 aktier pr. variant. Tidshorisonter 1, 7, 30 og 90 virkelige dage.

- Normal støj pr. virtuelt døgn: 1,2/2,2/3,5 % for lav/mellem/høj risiko.
- Roligere: 75 % af disse støjniveauer. Mere vild: 125 %. Meget vild: 150 %.
- Vækstkomponenten bevares på tværs af støjvarianterne; støjkorrektionen beregnes igen for hvert støjniveau. Mere støj giver dermed ikke automatisk mere tilføjet aritmetisk vækst. Det kan stadig påvirke afkastet gennem loft, øvre modstand, salgsgebyr og stikprøvevariation.
- 7× med ekstra vækst får en ekstra komponent, der isoleret svarer til +10 % over 30 virkelige dage, oven i kandidatens hidtidige vækst. Det er en parameter, ikke et minimumsafkast.

| Variant | Gns. 1 dag | Gns. 7 dage | Gns. 30 dage | Typisk 30 dage |
| --- | --- | --- | --- | --- |
| 3× tempo | -0,2 % | +0,5 % | +4,1 % | +3,0 % |
| 7× tempo | +0,1 % | +1,4 % | +9,9 % | +5,6 % |
| 7× + ekstra vækst | +0,4 % | +3,6 % | +20,5 % | +15,9 % |
| År på én måned · roligere | +0,7 % | +3,9 % | +18,8 % | +15,3 % |
| År på én måned · normal | +0,7 % | +3,7 % | +17,7 % | +13,2 % |
| År på én måned · mere vild | +0,7 % | +3,5 % | +16,2 % | +8,7 % |
| År på én måned · meget vild | +0,7 % | +3,3 % | +14,3 % | +6,0 % |

Alle afkast er efter det aftalte salgsgebyr. Procenterne gælder gennemsnittet for en spredt portefølje.

## Ny kontrolrunde efter kalibrering

Første runde gav 17,7 % månedligt gennemsnit for den direkte år→måned-model. Det er lavere end de tidligere års stikprøvegennemsnit på cirka 23 %. Derfor blev tre ekstra vækstkomponenter valgt ud fra pilotforsøget: normal +5 %, mere vild +6 % og meget vild +8 % over 30 virkelige dage. Støjniveauerne er uændrede i forhold til deres pilotvarianter.

De tre nye valg blev derefter låst og testet på helt nye seeds, 20261130 og 20261201, igen 100 markeder hver. Der blev ikke justeret videre på parametre eller valgt nye seeds for at ramme et bestemt resultat efter denne kontrolrunde. Kontrolrunden tester 1, 7 og 30 dage, ikke 90 dage for de nye ekstra vækstindstillinger.

| Variant | Gns. månedsafkast | Typisk månedsafkast | Porteføljer i plus | Midterste 90 % enkeltaktier |
| --- | --- | --- | --- | --- |
| År på én måned · uændret vækst | +22,2 % | +17,1 % | 69,5 % | -57,8 % til +161,1 % |
| Normale udsving + ekstra 5 % vækst | +28,1 % | +22,8 % | 77,0 % | -55,7 % til +173,9 % |
| Større udsving + ekstra 6 % vækst | +28,7 % | +20,4 % | 68,5 % | -67,5 % til +202,7 % |
| Meget store udsving + ekstra 8 % vækst | +29,7 % | +18,0 % | 64,0 % | -77,0 % til +232,2 % |
| 7× tempo + ekstra 10 % vækst | +20,0 % | +18,1 % | 78,5 % | -43,2 % til +115,1 % |

"Typisk" er medianen for hele porteføljen. Intervallet for enkeltaktier er 5. til 95. percentil af nettoafkastet for alle 4.000 enkeltaktieforløb; enkelte udfald ligger uden for intervallet.

## Dag og uge i kontrolrunden

| Variant | Gns. dag 1 | Gns. uge 1 | Gns. måned 1 |
| --- | --- | --- | --- |
| År på én måned · uændret vækst | -0,1 % | +4,9 % | +22,2 % |
| Normale udsving + ekstra 5 % vækst | +0,1 % | +6,0 % | +28,1 % |
| Større udsving + ekstra 6 % vækst | -0,1 % | +6,3 % | +28,7 % |
| Meget store udsving + ekstra 8 % vækst | -0,2 % | +6,8 % | +29,7 % |
| 7× tempo + ekstra 10 % vækst | +0,3 % | +4,9 % | +20,0 % |

Små eller negative gennemsnit på én dag er ikke det samme som manglende kursudsving. Perioden er kort, og salgsgebyr på de positive udfald påvirker kortsigtet slutlikvidation. Eksempelvis havde normalvarianten i kontrolrunden en 5.–95.-percentil for porteføljens dagsafkast på cirka −7,6 til +9,2 %.

## Store stigninger og tab på en måned

| Variant | Mindst fordoblet efter gebyr | Sluttede mindst halveret | Median største fald i enkeltaktier |
| --- | --- | --- | --- |
| År på én måned · uændret vækst | 10,1 % | 7,8 % | -40,4 % |
| Normale udsving + ekstra 5 % vækst | 11,2 % | 6,8 % | -39,4 % |
| Større udsving + ekstra 6 % vækst | 12,8 % | 12,2 % | -47,2 % |
| Meget store udsving + ekstra 8 % vækst | 14,3 % | 17,1 % | -54,1 % |
| 7× tempo + ekstra 10 % vækst | 6,8 % | 3,6 % | -31,2 % |

Fordobling er målt som mindst +100 % ved slutningen af måneden efter salgsgebyret. Halvering måles på slutkurs mod den oprindelige startkurs; ved tab er der intet salgsgebyr. Tallene er ikke det samme som andele, der kortvarigt rammer en top eller bund undervejs.

## Højrisikoaktier i kontrolrunden

| Variant | Høj risiko: 5./50./95. percentil netto | Høj risiko: mindst fordoblet netto | Høj risiko: halveret |
| --- | --- | --- | --- |
| År på én måned · uændret vækst | -70,4 % / +5,4 % / +250,3 % | 20,4 % | 17,0 % |
| Normale udsving + ekstra 5 % vækst | -68,9 % / +10,5 % / +264,2 % | 22,0 % | 15,5 % |
| Større udsving + ekstra 6 % vækst | -79,1 % / -2,8 % / +312,7 % | 22,1 % | 23,9 % |
| Meget store udsving + ekstra 8 % vækst | -86,7 % / -17,2 % / +351,1 % | 21,8 % | 32,1 % |
| 7× tempo + ekstra 10 % vækst | -57,6 % / +11,2 % / +164,2 % | 14,1 % | 9,2 % |

At øge udsvingene uden tilsvarende højere vækst for hver risikoklasse sænker det typiske resultat for højrisiko. Ekstra stor støj er derfor et andet gameplayvalg, ikke en entydig forbedring. Valg af den meget vilde variant kan genindføre problemet med mange højrisikoaktier, der gradvist mister værdi.

## Hvor stabilt er målet på 23 %?

| Direkte år→måned-model | Antal markeder | Månedligt gennemsnit |
| --- | --- | --- |
| Pilot | 200 | +17,7 % |
| Ny kontrol | 200 | +22,2 % |
| Samlet | 400 | +20,0 % |

Den direkte komprimering ligger i den ønskede størrelsesorden, men stikprøvegennemsnit varierer mellem forløb. Kontrolrundens normalvariant gav 22,2 % i gennemsnit og 17,1 % i median; 69,5 % af de spredte porteføljer sluttede i plus. Det betyder hverken, at alle brugere får +22 %, eller at det samme afkast kommer hver måned.

Den ekstra normale vækst gav 28,1 % i gennemsnit og 22,8 % i median i kontrolrunden. De ekstra vilde kombinationer gav endnu større spredning og flere store tab; højere gennemsnit er ikke det samme som et bedre typisk resultat.

## Tre måneders kontrol og langtidsbegrænsning

| Variant i pilot | Gns. netto efter 90 dage |
| --- | --- |
| 3× tempo | +12,7 % |
| 7× tempo | +31,8 % |
| 7× + ekstra vækst | +72,0 % |
| År på én måned · roligere | +67,8 % |
| År på én måned · normal | +60,2 % |
| År på én måned · mere vild | +50,5 % |
| År på én måned · meget vild | +39,2 % |

90-dageskolonnen gælder kun pilotens indstillinger, uden de senere ekstra +5/+6/+8 %-komponenter. Kurserne blev ikke nulstillet hver måned. Modstand over 250 og loftet på 2.500 er fortsat aktive. Resultaterne viser derfor ikke et fast gentaget månedsafkast. Et rent regnestykke med fast +23 % hver måned ville gøre 1.000 bananer til cirka 12.000 på et år; dette er ikke en prognose fra simuleringen.

## Vurdering

- Den direkte komprimering til én måned er et relevant udgangspunkt for brugerens ønskede spiltempo. Dage og uger har nu mærkbare udsving.
- Normal månedstakt er det mest nærliggende næste valg omkring det ønskede gennemsnit. Det har allerede betydelige muligheder for at fordoble eller miste halvdelen i en enkelt aktie.
- Normal månedstakt med den ekstra +5 %-komponent er et mere gavmildt alternativ, hvis cirka 28 % i gennemsnit og cirka 23 % i median i denne kontrolrunde er ønskeligt. Det bør ikke beskrives som en stabil 23 %-model.
- 7× tempo med ekstra vækst er et roligere alternativ tættere på cirka 20 % månedligt gennemsnit, med færre ekstreme udfald.
- De vilde indstillinger giver større gevinstmuligheder og større tab, men især meget høj risiko kan få negativt medianafkast igen. Det skal vælges bevidst.
- Aktiv handel og simple strategier er ikke gentestet med den nye virkelige handelsfrekvens. Der er endnu ikke truffet en endelig produktbeslutning eller implementeret en markedsmotor.

## Filer og genkørsel

- [Pilotresultater](results-20261125.json) og [CSV](results-20261125.csv)
- [Kontrolresultater](targeted-20261125.json) og [CSV](targeted-20261125.csv)
- [Simulationsmotor](compare.py)

Python, NumPy og NumBa kræves. Fra repoets rod:

```sh
python docs/experiments/market-tempo/compare.py --phase pilot --markets-per-seed 100 --workers 8 --out .data/market-tempo-pilot.json
python docs/experiments/market-tempo/compare.py --phase targeted --markets-per-seed 100 --workers 8 --out .data/market-tempo-control.json
```

Seed-numrene er blot tal til reproducerbar tilfældighed, ikke datoer for observerede markedsdata. Ingen data er hentet fra virkelige aktiemarkeder, Redis eller brugerporteføljer.
