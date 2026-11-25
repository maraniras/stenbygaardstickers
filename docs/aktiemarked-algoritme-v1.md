# Aktiealgoritme v1 — gemt 25. november 2026

Dette er det valgte grundlag for aktiemarkedet til version 3.0. Det er en fast version af simulationsmodellen, ikke en aktiv produktionsmotor. Git-tagget `aktiealgoritme-v1` fastholder kode, parametre, de 20 startaktier og testresultater samlet. Senere ændringer skal beskrives som en ny algoritmeversion.

## Valgte regler

- Ét tidligere simuleret år svarer til 30 rigtige dage: 365/30 i klokkehastighed. Ét rigtigt døgn indeholder 17.520 virtuelle minuttrin.
- Risiko lav/mellem/høj har grundstøj på 1,2/2,2/3,5 % pr. virtuelt døgn. 30 % af støjvariansen er fælles for aktierne; resten er individuel. Logstøj klippes til ±0,01 pr. virtuelt minut.
- Korte skjulte tilstande varer 30–180 virtuelle minutter med sandsynligheder 50 % rolig, 20 % op, 20 % ned og 10 % turbulent. Op/ned har ±2/4/7 % daglig logtrend efter risiko; turbulent støj ganges med 1,5.
- Hver aktie har desuden uafhængig medvind, neutral udvikling eller modvind i 7–28 **rigtige dage**. Der skiftes tilfældigt til en af de to andre tilstande. Overgangen glattes over to dage. Logbidragets målstyrke er ±log(1,25)/30 pr. rigtigt døgn; det er ikke et sikkert afkast. Separat RNG pr. aktie gør forløbet stabilt, når tidshorisonten forlænges.
- Gradvis kursmodstand starter over 250: `0,02 × max(log(kurs/250), 0)² / 1440` trækkes fra logkursen pr. virtuelt minut. Absolut loft er **2.500 bananer**, og loftet skal ikke oplyses i spillerens brugerflade.
- Ingen tilbagevenden til startkurs, ingen garanteret genopretning, ingen aktiesplit og ingen relativ dæmpning efter nylige stigninger i denne version.
- Salg koster 5 % af positiv realiseret gevinst; tab og køb er gebyrfri. Testhandler sker til kursen efter signalet. Ingen lån eller shorting indgår i modellen.

## Billige aktier

Startkursen er den faste oprindelige kurs, ikke dagens kurs. For startkurs under 25:

```text
vægt = 1 − min(log(startkurs) / log(25), 1)
støjfaktor = 1 − 0,35 × vægt
ekstra logvækstfradrag pr. rigtigt døgn = vægt × log(1,05) / 30
```

Støjen reduceres altså med op til 35 %. Støjkorrektion og vækstkompensation genberegnes efter reduktionen. Ved startkurs mindst 25 ændres aktiens forløb ikke. Risikoopdelingen og virksomhedsperioderne beholdes. Der er intet loft over en bestemt procentgevinst fra start.

Grundvækst før fradraget: `0,9 × quietCorrection + 0,1 × wildCorrection + log(1,05)/(365 × 1440)` pr. virtuelt minut. Korrektionerne er logaritmen til den forventede eksponentialværdi af den klippede normalstøj, beregnet af `noise_correction` i den arkiverede referencekode. Den præcise kode, ikke afrundede teksttal, er reproduktionsgrundlaget.

## Reproduktion og filer

- Parametre: `docs/experiments/market-company-trends/candidate-settings.json`.
- Minute-motor: `docs/experiments/market-tempo/compare.py` (`simulate`).
- Støjkorrektion/reference: `docs/experiments/market-improvements/compare.py`.
- Virksomhedstilstande: `docs/experiments/market-company-trends/company.py`.
- Billige aktier: `docs/experiments/market-company-trends/cheap.py`.
- De 20 startaktier: `docs/experiments/market-growth/market-simulation.json`.
- SHA-256 for disse og reproduktionsfilerne: `docs/experiments/market-company-trends/algorithm-v1-manifest.json`.

Med Python, NumPy og Numba:

```text
python docs/experiments/market-company-trends/year.py --variant cheap
```

Det faste årseksempel bruger seed 20261128 og skriver `year-cheap-20261125.json` og `.csv`. I eksemplet blev 1.000 bananer fordelt ligeligt på de 20 aktier til 3.878,03 efter gebyr; 16 sluttede i plus og fire i minus. Baseline, 90-dagespræfiks, uændrede dyrere aktier og kursloft er kontrolleret. Dette er et eksempel, ikke et forventet afkast.

## Testresultater og kendt afvejning

80 nye parrede årsmarkeder med 20 aktier sammenlignede modellen med det tidligere grundlag. For de syv aktier med startkurs højst 10 faldt andelen med mindst +1.000 % ved årets slutning fra 10,54 % til 6,07 % og mindst +2.000 % fra 6,61 % til 2,86 %. Andelen i plus faldt fra 61,79 % til 53,57 %. Spredte friske 30-dagesinvesteringer gav gennemsnitligt +12,69 % efter gebyr mod +15,43 % før; overlappende vinduer er afhængige.

Se `CHEAP.md`, de to `stress-cheap*.json`-filer og `cheap-summary-20261125.json` i eksperimentmappen. Syv konkrete strategier er testet med signal før eksekvering. Strategien omkring kurs 250 slår ofte behold; dens tabsrisiko skal vurderes før markedsåbning. Et skjult loft forhindrer ikke, at spillere kan opdage mønstre. Ingen test garanterer balancen for alle fremtidige forløb eller strategier.
