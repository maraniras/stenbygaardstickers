# Færre ekstreme procentstigninger for billige aktier

Brugeren ønsker, at aktier med lav startkurs har mindre chance for meget store procentgevinster. Aktierne beholder modstand over 250 og loft på 2.500, svagere virksomhedsperioder og ingen relativ dæmpning efter stigninger.

To forsøgsvarianter sammenlignes med det aftalte grundlag:

- `cheapGrowth`: gradvist lavere logvækst for startkurser under 25. Størst reduktion ved startkurs 1: log(1,05) over 30 rigtige dage, altså division med 1,05 sammenlignet med samme forløb uden rabatten. Dette er en reduktion af væksten, ikke en garanti om et bestemt afkast.
- `cheapGrowthAndNoise`: samme vækstreduktion og op til 35 % lavere kursstøj for de billigste aktier. Risiko lav/mellem/høj bestemmer fortsat det grundlæggende støjniveau. Støjkorrektion og vækstkompensation genberegnes ud fra den reducerede støj, så lavere støj ikke i sig selv forærer en højere typisk vækst.

Vægt = 1 − min(log(startkurs)/log(25), 1). Vægten bruges til begge reduktioner. Ved startkurs 25 eller derover er ændringen nul. Reglerne er knyttet til den faste oprindelige startkurs, ikke dagens kurs. Der indføres ikke et bestemt procentloft for, hvor meget en aktie kan stige.

Pilot og kontrol har hver 40 nye parrede markeder med 20 aktier over 365 rigtige dage. De tre varianter får identisk tilfældig kursstøj og virksomhedstilstande. Parametrene er fastlagt før pilot; kontrol bruger nye seeds med samme parametre. Pilotseeds: 20270510 + i × 1009. Kontrolseeds: 20270610 + i × 1009.

Hovedmålingerne er kursgevinst før gebyr på mindst 1.000 % (slutkurs mindst 11 gange start) og 2.000 % (mindst 21 gange start). Både årets slutning og højeste virtuelle minutkurs måles. Gruppe “billige” er startkurser til og med 10: syv af de 20 aktier. Sekundære målinger er tab, årligt nettoafkast, friske 30-dagesafkast på en spredt portefølje og de syv hidtidige handelsstrategier. Overlappende månedsvinduer er ikke uafhængige forsøg.

Kontroller: identiske støjparametre reproducerer den hidtidige motor; nulændring ved startkurs mindst 25; uændrede kursbaner for disse aktier i den nye kontrolrunde; endelige, positive kurser under loftet; korrekt eksekvering efter signal og gebyrberegning. Forsøget ændrer ingen rigtige banansaldi eller appens aktive funktioner.

## Resultat og valgt testmodel

80 markeder er gennemført: 560 billige aktieårsforløb pr. variant. Tærsklerne er bruttoændring i slutkurs fra start; tal for højeste kurs undervejs findes separat i JSON.

| Billige aktier, startkurs højst 10 | Før | Kun lavere vækst | Lavere vækst og støj |
|---|---:|---:|---:|
| Slutter året mindst 1.000 % op | 10,54 % | 8,21 % | 6,07 % |
| Slutter året mindst 2.000 % op | 6,61 % | 4,64 % | 2,86 % |
| Slutter året i plus | 61,79 % | 52,50 % | 53,57 % |
| Når mindst 2.000 % op på et tidspunkt | 12,86 % | 9,29 % | 6,07 % |

Gennemsnitligt frisk 30-dagesafkast på en ligeligt spredt portefølje efter gebyr faldt fra +15,43 % til +14,23 % med kun lavere vækst og +12,69 % med kombinationen. Det er den konkrete afvejning ved færre ekstreme gevinster. Overlappende vinduer er afhængige; afkastet er ikke et løfte.

Kombinationen vælges som nyt simulationsgrundlag, fordi den reducerer de ekstreme gevinster mest og i forsøget stadig har cirka halvdelen af de billige aktier i plus efter året. `cheap.py` indeholder justeringerne, `candidate-settings.json` angiver parametrene, og `year.py` bruger nu `--variant cheap` som standard. Den aftalte begrænsede model uden denne ændring kan stadig køres med `--variant bounded`. Hverken den skjulte kursgrænse, lav/mellem/høj-risikoopdelingen eller virksomhedsperioderne fjernes.

Resultater findes i `stress-cheapPilot-20261125.json`, `stress-cheapValidation-20261125.json` og `cheap-summary-20261125.json`. Sidstnævnte genskabes med `node docs/experiments/market-company-trends/summarize-cheap.mjs`. Alle vægtede andele og gennemsnit bruger lige store batchstørrelser; medianer er ikke gennemsnittet af batchmedianer. Ingen aktier tvinges til at stoppe ved en bestemt procentgevinst.
