# Ét helt år med normal månedstakt

Kørt 25. november 2026: 20 oprindelige aktier og 365 **virkelige** dage med varianten `monthNormal`, uden ekstra vækstkomponent. Det tidligere virtuelle år afvikles på 30 virkelige dage. Dette ene år svarer derfor til 12,1667 virtuelle markedsår og 6.394.800 virtuelle minuttrin.

## Forudsætninger

- Seed `20261128`, det på forhånd fastlagte første eksempel fra pilotforsøget i `../market-tempo/`. Der blev ikke søgt efter et pænt år eller valgt seed ud fra årsresultatet.
- De samme startpriser og risici som før. Støj pr. virtuelt døgn 1,2/2,2/3,5 %, 30 % fælles støjvarians, ingen grundkurstiltrækning og ingen ekstra +5/+6/+8 %-vækst fra kontrolvarianterne.
- Den hidtidige justerede vækst, støjkorrektion, regime-drift og regimelængder afvikles alle på den virtuelle tidsakse. Blød modstand over kurs 250 og absolut loft 2.500 er aktive hele året. Ingen månedlig nulstilling af kurser.
- Alle virtuelle minuttrin beregnes. Grafen viser slutkurser pr. virkelig dag. Ekstrema og største fald for hver aktie beregnes på alle virtuelle minutkurser; nogle interne toppe kan ligge mellem to fremtidige synlige minutkurser i appen.
- Den samlede investering starter på 1.000 bananer, ligeligt fordelt i bananer over alle 20 aktier. Brøkaktier, ingen rebalancering, lån eller ekstra indbetalinger. Salg sker hypotetisk ved årets slutning.
- Salgsgebyret er 5 % af positiv gevinst pr. aktie; tab på andre aktier modregnes ikke. Grafens porteføljeværdi viser, hvad en hypotetisk slutlikvidation på den pågældende dag ville give relativt til den oprindelige kostpris. Der handles ikke dagligt.
- Porteføljens største fald måles på hypotetisk likvidationsværdi for hver virtuel time, cirka hvert 4,93 virkelige minut. Aktiernes største fald måles for hvert virtuelt minut.

## Resultat i dette forløb

- 16 af 20 aktier sluttede over deres startkurs.
- 1.000 bananer blev til **4.812,35 bananer efter gebyr**, svarende til **+381,23 %**. Før gebyr var værdien 5.019,05 bananer.
- Første måned var porteføljen nede med **11,03 %** efter hypotetisk salgsgebyr.
- Største fald fra en hidtil nået porteføljetop til en senere bund var cirka **59,32 %**.
- Højeste interne aktiekurs var **526,96**. Ingen af de 20 aktier nåede loftet.
- Emil Airways sluttede på 341,76 fra startkurs 16; Emil Global sluttede på 1,46 fra startkurs 100. Store gevinster og store tab kan altså forekomme i samme marked.

Dette er **ét tilfældigt årsforløb**, ikke gennemsnittet af mange år eller en prognose. Det erstatter ikke de tidligere ensembletests af månedsafkast. Man kan ikke antage et fast månedligt afkast eller beregne dette årsresultat ved at gentage 23 % hver måned.

## Kontrol og filer

De første 90 virkelige dagskurser blev kontrolleret mod det allerede gemte piloteksempel for `monthNormal` med samme seed. Alle 1.820 kurser, inklusive startpunktet, stemte inden for 1e-9 relativ tolerance. Dermed er året en forlængelse af samme forløb.

- [Data og alle 366 dagskurser](result-20261125.json)
- [Tabel for de 20 aktier](result-20261125.csv)
- [Graf og tabel som samtalefragment](preview-20261125.html)
- [Afvikling af den eksisterende markedsmotor](simulate.py)

Grafens fire repræsentative tilstande er datavalideret: alle aktier, én aktie som indeks, portefølje i bananer og portefølje som indeks. Den native graf har ikke været visuelt inspiceret i browser som del af denne kørsel.

Kør fra repoets rod med Python, NumPy og Numba:

```sh
python docs/experiments/market-fast-year/simulate.py --seed 20261128 --out .data/market-fast-year-new.json
```

Forsøget ændrer ingen brugers saldo og implementerer ikke handel i appen.
