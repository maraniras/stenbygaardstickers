# Aktiemarked til version 3.0 — samlet arbejdsgrundlag

Samlet 25. november 2026 fra projektets eksisterende noter, simulationskode, resultater og to tidligere interaktive visninger. Dette dokument erstatter ikke brugerens senere beslutninger. Noterne beskriver flere forkastede modeller; historiske tal er ikke forventninger eller garantier for den kommende app.

## Branch og status

- Arbejdsbranch: `codex/v3.0-aktiemarked`.
- Udgangspunkt: produktionshotfix 2.10.1.2, commit `9a87a90dc6fa220084620830f6687702917a7c24`.
- Separat worktree: `C:/Git/StenbygaardStickers/.data/v3.0-aktiemarked`.
- 3.0 er arbejdsmålet. Appens versionsnummer ændres først ved den kommende udgivelse.
- Der er endnu ingen aktiemarkedsside, handels-API eller aktieportefølje i appen. Der findes analyseværktøjer og designforsøg. Oprettelsen af denne branch aktiverer ikke et marked og ændrer ikke driftens banansaldi.
- Rod-workspacets lokale ændringer er bevaret. Branchens app-kode starter fra den udgivne hotfix.

## Nyeste sammenligning — 25. november 2026

Efter den nye årssimulering blev fem varianter testet på de samme 200 markeder med 20 aktier, i alt 4.000 aktieår pr. variant. [Fuld sammenligning og metode](experiments/market-improvements/README.md).

Den nuværende models median for enkeltaktier var −18,8 % efter gebyr; lavere støj og justeret vækst gav +5,3 %. Med 30 % fælles støjvarians var medianen +6,5 %, og andelen af aktier, der sluttede mindst halveret, faldt fra 30,0 % til 7,1 %. Andelen af ligeligt spredte porteføljer i plus var 66 % med fælles faktor mod 90,5 % uden. Bløde trendskift ændrede næsten ikke årsresultaterne.

Ny anbefalet kandidat er lavere støj + justeret vækst + fælles markedsstøj. Det er endnu ikke en endelig produktbeslutning. Det observerede gennemsnit for en spredt portefølje steg til +22,8 % netto årligt; banantilførsel og den stadig stærke simple momentum-strategi skal indgå i vurderingen før åbning. Sjældne kurser omkring 1.000 blev ikke observeret i den nye kandidat. De historiske afsnit nedenfor bevares som beslutningsgrundlag.

## Produktønsker, som allerede var noteret

- Fiktive aktier købes og sælges med appens bananer.
- Aktiekurser ændres hvert minut, tilfældigt og uden at begivenheder i appen styrer dem.
- Markedet skal fortsætte logisk uden besøgende. Manglende minutter kan beregnes ved næste serverkontakt; et cron-job hvert minut er derfor ikke et krav i de tidligere noter.
- Alle skal handle på ét fælles marked. Konto, saldo og handler skal følge brugeren på tværs af enheder; den konkrete handelsløsning er endnu ikke valgt.
- Grafer skal vise de seneste 72 timer, altså 4.320 minutintervaller. Foreslåede/registrerede grafvalg: 1, 2, 3, 6, 24 og 72 timer. De gamle analysevisninger viser også dag, uge og år for at sammenligne modeller; dette er et andet formål end appens 72-timershistorik.
- Startkurser i området 1–100 bananer med lav, mellem eller høj risiko uafhængigt af startprisen.
- Kurser normalt over nul og op til omtrent 250; omkring 1.000 skal være sjældent, højere muligt i særlige forløb. Det registrerede absolutte sikkerhedsloft er 2.500 bananer.
- Intet fast kursgulv: modellen kan nærme sig nul uden at ramme nul. Praktisk talpræcision og afrunding ved meget små kurser mangler at blive fastlagt.

Det fælles marked og kontobundne handler er også nødvendige integrationshensyn til appens eksisterende økonomi. Detaljer om ordretyper, handelstidspunkter og opdateringsmekanisme er ikke færdigbesluttet.

## Den seneste afprøvede retning

Opdateret i samtalen efter arkivgennemgangen: Indgangen skal være et aktieikon ved siden af banansaldoen i toppen. Saldo og ikon skal også vises på stickerkortet. På denne branch linker ikonet til `/marked`, som foreløbig er en ærlig forhåndsvisning uden handel.

Der er nu valgt en hybrid med baggrundsberegning hvert **15. minut** via QStash, også uden besøgende. Minutpunkterne bevares; ved besøg eller handel indhentes de sidste manglende minutter. Fejlede baggrundskørsler skal kunne indhentes ved næste kørsel/besøg. Selve job- og markedsmotoren er endnu ikke implementeret. Tidligere forsøg med andre intervaller er ikke den valgte retning.

1. **Ingen tilbagevenden til grundkursen.** Startprisen bruges kun ved start, ikke som et forudsigeligt fremtidigt kursmål. Dette afløser det oprindelige ønske om fast grundkurs.
2. **Gratis køb og 5 % af positiv realiseret gevinst ved salg.** Intet gebyr ved tab eller nulgevinst, intet minimum. Dette er den seneste afprøvede gebyrmodel, ikke færdig handelsfunktionalitet.
3. **Gennemsnitlig kostpris** ved flere køb og delvise salg. Tab på en aktie eller en senere handel refunderer ikke allerede betalte gevinstgebyrer i forsøgene.
4. **Dæmpede udsving**, med beskeden positiv vækst som foreløbig kandidat. Kursmodel og kalibrering er stadig ikke endeligt godkendt.

Eksempel på gebyr: køb for 100, sælg for 120 → gevinst 20, gebyr 1, udbetalt 119. Salg for 80 → gebyr 0, udbetalt 80. Ved delvis handel beregnes gevinsten på den solgte andel ud fra dens gennemsnitlige kostpris.

Brøkaktier, ingen lån, ingen shorting og ingen ekstra indbetalinger indgik i simuleringernes metode. De må ikke forveksles med allerede godkendte produktbegrænsninger.

## Hvorfor den første model blev ændret

Den første model trak priserne tilbage mod en fast grundkurs. I handelstesten kunne en simpel strategi købe under 80 % af grundkursen og sælge ved grundkursen igen. Efter 0,25 % gebyr på både køb og salg gav den medianårsafkast på ca. 145/411/981 % for lav/mellem/høj risiko; næsten alle testpungene sluttede i plus. Stop-loss og højere handelsgebyr løste ikke problemet. Strategien var ikke risikofri, men den var alt for stærk som valuta-generator.

Et vandrende balancepunkt dæmpede problemet uden at løse det. Derfor gik vi videre til en model uden grundkurstiltrækning. Faste gebyrer på begge sider af en handel straffede samtidig hyppig handel meget hårdt; det motiverede forsøget med gevinstgebyr.

## Seneste kursparametre og åbne balanceproblemer

Den dæmpede v2-model bruger basal daglig støj på 2/4/7,2 % og regime-drift på ±2/4/7 % for lav/mellem/høj risiko. Regimer varer 30–180 minutter med sandsynligheder 50 % rolig, 20 % medvind, 20 % modvind og 10 % urolig. Urolig støj ganges med 1,5. Modstand over 250 vokser gradvist; loftet er 2.500.

Basal støj klippes til ±0,01 i log-kurs, men trend, støjkorrektion og modstand kommer oveni. Derfor er den samlede minutbevægelse ikke præcist begrænset til 1 %. Støjkorrektionen fjerner støjens skjulte forventede prisstigning; den gør ikke hele markedets afkast neutralt.

Uden ekstra vækst gav den dæmpede variant medianårsafkast ved køb-og-behold efter gebyr på ca. −5,3/−30,5/−66,9 %. Lavere udsving hjalp, men især højrisikoaktier mistede for ofte meget værdi over lang tid.

Tre vækstmodeller blev derefter afprøvet på parrede tilfældige forløb:

| Variant | Tilføjet komponent | Status |
| --- | --- | --- |
| Uden vækst | Ingen ekstra vækstdrift | Kontrolmodel |
| Beskeden vækst | `ln(1.08/1.15/1.25) / 525600` pr. minut afhængigt af risiko | Foreløbig kandidat |
| Risikokompensation + vækst | Kompensation for støjkorrektion plus nominelt 5 %-mål | Diagnostisk; tilfører meget mere valuta |

8/15/25 % er kun den tilføjede vækstkomponent, ikke det færdige forventede afkast. Risikokompensationen svarer isoleret til omtrent 14/46/204 % ekstra årligt; det er ikke bare 5 % ekstra bananer.

Kontrolforsøgets individuelle medianårsafkast efter gebyr:

| Model | Lav risiko | Mellem risiko | Høj risiko |
| --- | ---: | ---: | ---: |
| Uden vækst | −10,3 % | −26,5 % | −65,4 % |
| Beskeden vækst | −3,1 % | −15,5 % | −56,7 % |
| Risikokompensation + vækst | +2,1 % | +6,8 % | +4,2 % |

Diversificeringskontrol: 50 kurve med 20 aktier, samlet 1.000 bananer ligeligt fordelt i startbeløb, beholdt et år uden rebalancering. Gevinstgebyr opgøres pr. aktie uden modregning af andre aktiers tab:

| Model | 5./50./95. percentil for årsafkast | Gennemsnit | Kurve i plus |
| --- | --- | ---: | ---: |
| Uden vækst | −36,5 / −8,5 / +51,8 % | −0,8 % | 20 af 50 |
| Beskeden vækst | −27,2 / +4,0 / +71,0 % | +13,6 % | 33 af 50 |
| Risikokompensation + vækst | +1,9 / +50,0 / +173,3 % | +69,7 % | 48 af 50 |

Forsøgene har uafhængige aktieudsving, endnu ingen fælles markedsfaktor. Det gør spredning særligt effektiv. Tallene er stikprøver, ikke sandsynligheder eller lovede afkast. Beskeden vækst virker mindre voldsom for bananøkonomien, men løser ikke det typiske langtidstab for individuelle højrisikoaktier.

## De 20 prøveaktier

Navnene og antallet er simulationsinput, ikke en endeligt fastlagt aktieliste.

| Aktie | Startkurs i bananer | Risiko |
| --- | ---: | --- |
| Bananboden | 1 | Lav |
| Emils Sokker | 2 | Mellem |
| Knæ Holding | 3 | Høj |
| Lygtepæl A/S | 4 | Lav |
| Stickerpost | 5 | Mellem |
| Norsk Offshore | 7 | Høj |
| Aalborg Lim | 10 | Lav |
| Motława Mad | 13 | Mellem |
| Emil Airways | 16 | Høj |
| Klister & Co | 20 | Lav |
| Rom Express | 25 | Mellem |
| Skrigeteknik | 30 | Høj |
| Nicole Design | 38 | Lav |
| Mathias Montage | 45 | Mellem |
| Bananraketten | 52 | Høj |
| Stenbygaard Fragt | 60 | Lav |
| Colosseum Kiosk | 70 | Mellem |
| Mikkels Månebase | 80 | Høj |
| Verdenslim | 90 | Mellem |
| Emil Global | 100 | Høj |

## Det, vi fortsat skal beslutte før implementering

- Endelig kursmodel: individuel risiko, langsigtet vækst og fælles markedsbevægelser.
- Acceptabel tilførsel af bananer, især til diversificerede eller meget store porteføljer.
- Endelig gebyrregel, afrunding og præcision for bananer, brøkaktier og kostpris.
- Handelsgrænser og præcis eksekvering: hvilken kurs låses ved klik, forældede kurser og genforsøg.
- Atomisk fælles håndtering af portefølje og eksisterende banansaldo. En handel skal hverken kunne gentages eller bruge samme bananer på to enheder.
- Serverens skjulte tilfældighed, efterberegning af kurser og sikkerhed mod at kunne udlede fremtidige kurser. Dette er implementeringshensyn, ikke eksisterende markedskode.
- Historik og polling, så minutkurser og grafer ikke skaber unødvendigt Redis-forbrug. Optimering af dette har ekstra relevans efter den senere samtale om Redis-forbrug.
- Markedets placering i navigationen, porteføljeside, handelshistorik, statistikker og eventuelle badges. Intet endeligt børsdesign eller badge-sæt er fundet.
- Hvilke aktier/navne der skal med, og om spillerne skal kunne se risikoklassen.

Mit næste forslag er at vælge en justeret model med beskeden vækst, teste en fælles markedsfaktor og genteste både individuelle aktier og diversificerede porteføljer, før handelsdelen bygges. Dette er et forslag, ikke en allerede aftalt regel.

## Andre gemte idéer, som ikke automatisk er med i 3.0

Kviklån af bananer, sportsbetting og brugeroprettede væddemål er gemt som fremtidige ønsker uden aftalte renter, odds, datakilder eller afgørelsesregler. En opdeling af appen i Stickers/Bananland blev foreslået tidligere, men ikke bestilt. Eksisterende bananlager og formuevisninger er beslægtede, men ikke aktiehandel.

## Kilder og genskabelse

- [Historiske noter: Spil og valuta](spil-ideer.md), især afsnittene om markedstest, ny kursmodel og langsigtet vækst. Dokumentet rummer også ældre status om allerede udgivne spil; brug det ikke som nutidig status for hele appen.
- [Arkiverede sammenfatninger og vækstkode](experiments/market-growth/). To forudbestemte seeds: 20261101 og 20261102, hver 50 markeder × 20 aktier = 1.000 aktieår pr. vækstmodel. Kontrolseedet blev ikke brugt til parametervalg.
- [Gendannet komplet lokalt simulationsarkiv](experiments/market-archive/README.md): 20 filer inklusive begge HTML-visninger, gamle og nye modeller, handelstests, fulde kurver, CSV og byggescripts. Checksummer bevarer sporbarhed til de fundne originaler.
- Den seneste brugerbestilling i samtalen er at oprette arbejdsbranchen til version 3.0 og genfinde arbejdet. Den godkender ikke automatisk en af de historiske modeller eller de øvrige fremtidsidéer.

Simulationsmetode: næste minuts kurs bruges efter beslutninger hvert 10. minut; ingen fremtidige kurser eller skjulte regimer gives til strategierne; slutlikvidation og gebyrer medregnes. Korte observationsvinduer kan overlappe. Måneder i forsøgene er 30/90/180 dage. Den tidligere dip-strategis store fordel er ikke genfundet i de fem senest testede strategier, men det er ikke et bevis for, at ingen anden stærk strategi findes.
