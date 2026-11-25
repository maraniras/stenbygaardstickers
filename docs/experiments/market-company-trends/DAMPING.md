# Dæmpning efter store stigninger

Efter forløbet med kurs cirka 1,8 mio. er den ubegrænsede model ikke accepteret som færdig algoritme. Denne test afprøver en hypotese, ikke en garanti for en bestemt maksimal kurs.

Hver aktie får et glidende gennemsnit af sin logkurs med en tidskonstant på 30 rigtige dage. Startværdien er aktiens startkurs. Gennemsnittet opdateres efter hver virtuel minutovergang. Når aktien er mere end 1,5 gange gennemsnittets geometriske kurs, trækkes et gradvist logbidrag fra den efterfølgende kursændring:

```text
overskud = max(logkurs − glidende loggennemsnit − log(1,5), 0)
dæmpning pr. rigtig dag = styrke × overskud²
```

Der sammenlignes ingen dæmpning, styrke 0,10 og styrke 0,35. Ingen af varianterne bruger absolut kursmodstand eller et fast kursloft. De har samme støj, risikoklasser, grundvækst, 7–28-dages virksomhedsperioder og svagere trendstyrke log(1,25)/30. Dæmpningen er nul ved rolige eller faldende kurser og giver aldrig positiv hjælp til en taber. En aktie kan stadig fortsætte op eller ned.

Det er en relativ regel: en aktie på 100 og dens gennemsnit på 50 får præcis samme procentvise dæmpning som en aktie på 10 og gennemsnittet på 5. Nulstyrke reproducerer den tidligere motor; translation af begge logkurser ændrer ikke dæmpningen. Disse egenskaber samt Python/JIT, positive/endelige priser, fremadrettet eksekvering og gebyrberegning kontrolleres i kørslen.

40 nye parrede pilotmarkeder og derefter 40 nye kontrolmarkeder med 20 aktier og ét rigtigt år pr. variant. Pilotseeds starter ved 20270310, kontrol ved 20270410; begge stiger med 1009 pr. marked. Parametrene er fastlagt før pilot. Overlappende vinduer er ikke uafhængige forsøg.

De tidligere seks handelsstrategier suppleres med en syvende: sælg over 1,5 gange et observerbart 30-dages gennemsnit og køb igen under 1,2 gange. Strategien beregner kun et timebaseret gennemsnit af kendte kurser og handler et rigtigt minut efter signalet. Den får ikke motorens interne minutgennemsnit. Behold og de andre strategier følger de hidtidige regler. Porteføljer er ligeligt fordelt i bananer på 20 aktier uden overførsler mellem aktier.

Vurdering: ekstremkurser, andel over 1.000/10.000, 30-dagesafkast, tab ved årets slutning, lange tabsperioder og hvor ofte strategier slår behold. En rent relativ regel kan ikke garantere en bestemt absolut maksimal kurs på alle tidshorisonter. Testen dækker ét år og syv konkrete strategier; den dokumenterer ikke, at ingen anden strategi har en fordel.

## Afsluttet resultat

Begge runder er afsluttet: 80 forskellige markeder, 20 aktier, 365 rigtige dage og tre parrede varianter. Samlet 4.800 aktieårsforløb, men kun 80 forskellige markedsscenarier. Resultater findes i `stress-dampingPilot-20261125.json`, `stress-dampingValidation-20261125.json` og `damping-summary-20261125.json`; sidstnævnte kan genskabes med `node docs/experiments/market-company-trends/summarize-damping.mjs`.

| Måling, samlet over begge lige store runder | Ingen dæmpning | Mild 0,10 | Kraftig 0,35 |
|---|---:|---:|---:|
| Højeste observerede kurs | 471.148 | 45.436 | 12.318 |
| Aktier med top over 1.000 | 12,31 % | 6,88 % | 3,81 % |
| Aktier med top over 10.000 | 2,25 % | 0,44 % | 0,19 % |
| Gennemsnitligt frisk 30-dagesafkast, spredt portefølje efter gebyr | +21,26 % | +15,75 % | +12,37 % |
| Enkeltaktier i minus efter året | 33,94 % | 37,00 % | 41,88 % |
| Sælg efter store stigninger slår behold | 25,00 % | 53,75 % | 82,50 % |

Tallene sammenligner de samme 80 nye støj- og virksomhedsforløb. Baselinens maksimum på 471.148 er derfor ikke den tidligere årstests 1,8 mio. og må ikke læses som en ændring af det gamle resultat. Månedsgennemsnit og andele er samlet med lige vægte; maksimum er maksimum af begge runder. Percentiler er ikke gennemsnittet af batchpercentiler.

**Vurdering: Ingen af de to varianter vælges som færdig kandidat.** Dæmpningen reducerer de store toppe, men løser ikke absolutte ekstremkurser og trækker det ønskede månedlige afkast ned. Den kraftige variant gør den afprøvede strategi med salg efter store stigninger markant mere fordelagtig relativt til behold. I den nye kontrolrunde alene slog den behold i 87,5 % af markederne, mod pilotens 77,5 %. Dette er ikke bevis for tabsfri handel; det er grund til ikke at promovere denne parameterkombination.

Kontrollerne bestod, og forsøget er gemt som en valgfri udvidelse af simulationsmotoren. Udelades `recent_rules`, er den tidligere model bevaret. `candidate-settings.json` forbliver markeret under vurdering. Der er ingen ny endeligt accepteret algoritme, ingen produktionsændring og ingen ændring af rigtige banansaldi.
