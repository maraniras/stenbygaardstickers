# Længere virksomhedsperioder

**Seneste justering:** [Billige aktier](CHEAP.md) får efter brugerens ønske mindre chance for ekstreme procentgevinster. 80 nye markeder afprøvede to varianter; kombinationen af lavere vækst og støj under startkurs 25 er valgt i testmodellen. For startkurser højst 10 faldt andelen med mindst +2.000 % ved årets slutning fra 6,61 % til 2,86 %. Andelen i plus faldt fra 61,79 % til 53,57 %, og spredte 30-dagesafkast faldt fra +15,43 % til +12,69 % i gennemsnit. `year.py` bruger nu `--variant cheap` som standard. Loft, modstand og virksomhedsperioder er bevaret. Tidligere grafer er historiske forløb og er ikke omskrevet.

**Bevaret simulationsgrundlag:** Brugeren har valgt at beholde gradvis modstand over 250 og et skjult loft på 2.500 bananer. Svagere virksomhedsperioder (log(1,25)/30, 7–28 dage, to dages glatning) beholdes. Den nye relative dæmpning anvendes ikke. `candidate-settings.json` afspejler dette og justeringen for billige aktier. Dette er ikke en aktiv handelsmotor eller en erklæring om en perfekt algoritme.

**Historiske forsøg:** [Års- og handelstesten](STRESS.md) og [dæmpningsforsøget](DAMPING.md) bevares. Den ubegrænsede kandidat kan stadig reproduceres med `--variant candidate` og den oprindelige stærkere trend med `--variant legacy`; de overskriver ikke det nye begrænsede forløb.

## Nyt årseksempel med det aftalte loft

`year-bounded-20261125.json`, `.csv` og `preview-bounded-year-20261125.html` viser 365 rigtige dage, seed 20261128, samme kursstøj som de tidligere årsgrafer. 16 aktier sluttede i plus, fire i minus. Højeste virtuelle minutkurs var 516,19; ingen aktie ramte loftet. En investering på 1.000 bananer fordelt ligeligt efter beløb blev til 5.012,31 efter gebyr (+401,23 %). Største porteføljefald undervejs var 60,38 %, målt hver virtuel time. Dette er ét forudbestemt eksempel og ikke et forventet afkast.

Baseline er afstemt mod hele det oprindelige år, trendgeneratorens første 90 dage er uændrede ved forlængelse, og alle virtuelle pristoppe er kontrolleret mod loftet. Grafen starter med banankurser på logaritmisk skala og kan skifte til indeks 100, enkelte aktier eller en spredt investering. Tabellen viser start, slut, PLUS/MINUS, kursændring, netto, minimum/maksimum og største fald fra top. Diagramdata og fire tilstande er valideret; rendering er ikke browserinspiceret. Gamle grafer er bevaret.

Brugeren godkendte 25. november 2026 at afprøve medvind og modvind i perioder på 1–4 rigtige uger. Implementeret i simulationsmodellen på 3.0-branchen; ikke aktiveret i appen.

Hver aktie får sin egen skjulte tilstand: medvind, neutral eller modvind. En tilstand varer 7–28 virkelige dage, og næste tilstand er tilfældigt en af de to andre. Overgangen glattes med en tidskonstant på to dage. Der er ingen tilbagevenden til startkursen og ingen garanti for genopretning. Dette påvirker tendensen, ikke dagens sikre afkast.

Første teststyrke er ±log(1,5)/30 pr. rigtig dag før glatning. Isoleret over 30 dage svarer det til ×1,5 eller ÷1,5; de faktiske perioder er kortere, og støj, vækst samt øvre modstand gælder fortsat. Styrken er ens for alle risikoklasser. Lav/mellem/høj beholder deres tidligere støjniveauer. Grundvækst og salgsgebyr er uændrede. Symmetrisk logtrend er ikke en garanti for uændret aritmetisk gennemsnitsafkast.

Den nye parameter `company_drift` i den eksisterende motor er valgfri og angiver logbidrag pr. virtuel minut, per model, rigtig dag og aktie. Den bruger specifikt månedstempoet 365/30: 17.520 virtuelle minutter pr. rigtig dag. Andre tempoeksperimenter udelader parameteren. Tilstande genereres med en separat RNG, så den oprindelige kursstøj er identisk i sammenligningen.

`compare.py` kører 60 parrede markeder med 20 aktier over 90 rigtige dage. Seeds er fastlagt inden kørslen. Resultater og første eksempel findes i `results-20261125.json`. Intet eksempel udvælges efter afkast.

Kontroller: nultrend gengiver den tidligere motor, Python/JIT stemmer overens, positiv trend giver det forventede logbidrag, varigheder er 7–28 dage, og priser er endelige, positive og under loftet. Hele appen er ikke ændret; typecheck er ikke relevant for disse Python-analysefiler.

Begrænsninger: 90 dage frem for et helt års ensemble; overlappende 30-dagesvinduer er afhængige observationer. Aktiv handel og muligheden for at udnytte synlige langsomme trends skal fortsat testes, før modellen vælges til drift. Modellen sikrer ikke et bestemt antal tabere.

## Første sammenligning

| Måling | Før | Virksomhedsperioder |
|---|---:|---:|
| Median af længste periode under startkurs pr. aktie | 21,5 dage | 25,0 dage |
| Aktier i minus efter 90 dage | 45,75 % | 46,42 % |
| 30-dagesvinduer med tab | 48,32 % | 48,93 % |
| Aktier med mindst ét 30-dagesfald over 20 % | 83,17 % | 85,58 % |
| Median nettoafkast, spredt portefølje over 90 dage | +42,94 % | +43,95 % |
| Gennemsnitligt nettoafkast, samme porteføljer | +55,59 % | +61,32 % |

Daglige logudsving er stadig tydeligt opdelt: lav 4,71 %, mellem 8,59 %, høj 13,61 %. Ændringen er moderat ved denne styrke. Det større gennemsnit er ikke en ekstra garanteret vækstkomponent; symmetrisk logtrend øger også spredningen. Ingen statistisk sikker forbedring eller endelig afkastkalibrering påstås ud fra denne kørsel. En længere periode under startkurs er ikke det samme som et fald hver eneste dag.

Kør med NumPy og Numba:

```text
python docs/experiments/market-company-trends/compare.py
```

## Helt år med virksomhedsperioder

`year.py` simulerer 365 virkelige dage i månedstempo med samme oprindelige kursstøj-seed 20261128 som den tidligere årstest. `company.py` bruger selvstændige RNG-strømme pr. aktie, så trendforløbets første 90 dage er uændret, når horisonten forlænges. Det er samme trendformel som 90-dagesstudiet, men ikke det studies sekventielle trend-RNG. Årets baseline er verificeret mod samtlige 366 × 20 gamle dagspunkter; den nye trendgenerators 90-dagespræfiks er også verificeret.

Resultater findes i `year-20261125.json`, `.csv` og `preview-year-20261125.html`. 17 aktier sluttede i plus og 3 i minus. En oprindelig investering på 1.000 bananer ligeligt fordelt på alle aktier blev til 5.513,78 efter gebyr (+451,38 %). Det er ét forudbestemt forløb, ikke et forventet årsafkast. De tre tabere skal ikke fortolkes som et mål for fremtidige markeder. Ingen nye vækstparametre er indført.

Tabellen viser PLUS/MINUS med tekst og pil, start/slut, kursændring før gebyr, separat nettoafkast, laveste/højeste og største fald fra tidligere top. Grafen viser som standard indeks 100 på logaritmisk skala og kan skifte til banankurser, enkelte aktier eller en spredt investering. Diagramdata og fire visningstilstande er valideret; rendering er ikke browserinspiceret.
