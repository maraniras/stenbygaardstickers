# Et nyt år med de oprindelige 20 aktier

Kørt 25. november 2026, seed `20261125`, 365 døgn og 525.600 minuttrin. Startpriser og risikoklasser kommer direkte fra `../market-growth/market-simulation.json`.

Model: den seneste kandidat fra arkivet, dæmpet v2 uden grundkurstiltrækning med beskeden vækst (`smallGrowth`). Den var ikke endeligt godkendt før denne nye simulering. Basal daglig støj 2/4/7,2 %, regime-drift ±2/4/7 % og ekstra log-vækst svarende isoleret til 8/15/25 % årligt. Modstand over 250, loft 2.500, intet fast gulv. Ingen fælles markedsfaktor eller app-events. Vækstkomponenten er ikke et løfte om samlet afkast.

- `simulate.py`: beregner kurser og statistik, uden at udføre handler.
- `result-20261125.json`: fulde timepunkter, dagspunkter og minutbaserede højeste/laveste/største fald for hver aktie.
- `result-20261125.csv`: sammenligning af alle 20 aktier. `NettoHoldPct` inkluderer 5 % af positiv gevinst ved hypotetisk køb ved start og salg ved årets slutning; de øvrige kurskolonner er før gebyr.
- Største fald er fra en hidtil nået top til en senere bund, ikke nødvendigvis fra årets absolutte højeste til absolutte laveste, hvis bunden indtraf først.
- Grafen i samtalen viser dagspunkter og logaritmisk Y-akse, så både billige og dyre aktier kan ses. Ekstrema og største fald er beregnet på alle minutkurser, inklusive startpunktet.

Kontrol: Den oprindelige, uændrede `simulate-market-growth.py` blev kørt separat med samme seed og én gentagelse. Samtlige 175.220 timekurser og alle 40 min/max-værdier matchede den nye afvikling; største absolutte afvigelse på timekurser var cirka `4.3e-14` bananer. Python/NumPy og begge motorers præcise beregningsrækkefølge giver små numeriske afrundingsforskelle.

Resultat: seks af tyve aktier sluttede over startkursen. Det er ét tilfældigt forløb, ikke en sandsynlighed for fremtiden. En ny seed kan give et andet år. De tidligere balanceproblemer for individuelle højrisikoaktier er stadig relevante.

Kørsel fra repoets rod med Python og NumPy:

```sh
python docs/experiments/market-year/simulate.py --seed 20261125 --out .data/market-year-new.json
```

Filerne er analyse og ændrer ingen brugers banansaldo eller den aktive appversion.
