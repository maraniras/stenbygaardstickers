# Spil og valuta — brainstorm

Opdateret 29. oktober 2026. Valuta og de to daglige spil er nu bestilt og implementeret på dev. Casino og børs er fortsat idéer til senere.

## Implementeret økonomi og daglige spil (gælder over tidligere forslag nedenfor)

- 250 bananer ved oprettelse, også én gang til eksisterende konti. Konto og saldo bevares ved logud.
- Godkendt sticker: DK 250 uanset afstand. Udland glidende fra 500 til 5.000: afstand fra Aalborg 0/1.000/2.000/4.000/6.000/8.000 km → 500/750/1.250/2.500/3.750/5.000. Afrundes til nærmeste 50; 3.000 km giver 1.900. Hver navngiven person får fuld belønning én gang pr. sticker.
- Gamle badges: 20 bananer pr. levelpoint, hvert trin én gang. Pioner 60 pr. land. Ingen bananer for rekorder, der kan mistes. Årets Dengse 200, når kalenderåret er slut i dansk tid. Godkendte historiske stickers og allerede optjente badges krediteres også.
- Byspil: fem gæt med seks fælles svarmuligheder; 50/40/30/20/10 ved korrekt svar, nul ved tab. Luftfoto gennem serveren, udzoomning efter forkert gæt. Alle seks byer udelukkes fra de næste 20 dage; 192 byer i 32 grupper. Ikke de faktiske stickers.
- Gratis dagligt hjul: 0/1/10/25/50/100/500 bananer med 35/10/30/18/5/1,5/0,5 % chance. Gennemsnit 14,1 pr. spin. Kun nul tæller som nitte.
- Ny dag kl. 04.00 Europe/Copenhagen inkl. sommertid. Forsøg, saldo og udfald er fælles for brugerens enheder, serverberegnede og atomisk gemt. Genindlæsning giver aldrig ekstra spil/belønninger. Se x67–75 i badges.md for alle nye badges og bonusser.
- Ingen direkte XP pr. spil; XP gives kun ved nye spilbadgetrin (1/2/3/4/5), singles 2/1/1. Formue giver ingen XP. Den lave faste XP-grænse lader stickers beholde vægten i levelsystemet.
- Bananer skal bruges til kosmetik og måske senere rigtige Emil-stickers i forskellige varianter. Butik, priser, casino og børs er ikke bygget nu.

## Valuta

- Valutaen hedder **bananer**.
- Spillene skal kunne give level-point med et loft, så stickers stadig vejer tungt. Beløb og pointregler er ikke fastlagt.

## Seneste afklaringer om casino, børs og lager

- Blackjack: brugeren ønsker 10–50 bananer i startindsats. Split/double kan give større samlet indsats.
- Slots hedder **Bananditten**. Brugeren har valgt **96 % RTP**. Præmier/sandsynligheder skal tilpasses dette, før spillet bygges.
- Lykkehjulet er et gratis dagligt spin med bananer eller nitte. Badges for samlet antal spins, jackpot **og streak**. Foreslået streak: 3/7/14/30/100 dage.
- **Dagsgrænse kl. 04.00 dansk tid (Europe/Copenhagen)** for daglige spil og streaks, også ved sommer-/vintertid. Et spildøgn går fra kl. 04.00 til næste kl. 04.00. En streak fortsætter ved aktivitet i næste spildøgn og brydes først, når et helt spildøgn springes over; optjente badges og bedste streak bevares.
- Aktier skal ændre kurs hvert minut, tilfældigt uden events fra appen. Markedet skal fortsætte uden besøgende og kunne vise en graf over de seneste **72 timer** (4.320 minutintervaller). Grafvalg: **1, 2, 3, 6, 24 og 72 timer**. Manglende minutter kan beregnes efterfølgende på serveren, så man ikke behøver et cron-job hvert minut.
- **Kursmodel**: brugeren foretrækker en fast grundkurs og ønsker ikke ustyrlig/uendelig vækst. Startkurser 1–100 bananer med uafhængig lav/mellem/høj risiko. Kurser skal normalt ligge over 0 og op til ca. 250, sjældent nå omkring 1.000 og kunne gå højere i ekstraordinære tilfælde. Brugeren har valgt et absolut sikkerhedsloft på **2.500**. Intet fast minimum: multiplikative kurser kan nærme sig nul uden at ramme nul. Præcis model/kalibrering er ikke godkendt endnu; se testresultater nedenfor.
- Bananlageret på profilen skal have flere visuelle trin; en voksende bunke bananer kan give mellemtrin mellem hylde, kasser, skur og stort lager. Brugeren kan lide mørkt udseende.
- Forslag til opdeling i samme app: topvalg Stickers/Bananland med hver sin bundmenu, fælles konto/profil. Brugeren har endnu ikke bestilt denne opdeling.

## Dagligt geografispil: Emil er faret vild

- En fiktiv sticker placeres ved en hovedstad. Man ser et luftfoto uden stednavne.
- Seks hovedstæder som svarmuligheder; de samme knapper hele runden.
- Fem gæt. Efter et forkert gæt fjernes den valgmulighed, og luftfotoet zoomer længere ud.
- Alle får samme dagsopgave. Forsøg og belønning skal knyttes til brugeren.
- Brugeren ønsker, at en by ikke optræder som svarmulighed igen de næste 20 dage.
- Forslaget er, at pausen gælder alle seks byer, både korrekt svar og distraktorer; det kræver mindst 126 byer i en daglig rotation.
- Man vinder bananer for korrekt svar og flere for færre gæt.
- Foreslået, endnu ikke fastlagt: 100 / 75 / 50 / 30 / 15 bananer ved korrekt svar på gæt 1–5; 0 ved tab. Ingen betaling for forkerte gæt.
- Seneste forslag er hjælp alene gennem udzoomning; afstand og retning var en tidligere mulighed.
- Luftfoto-eksempel med Rom viste ca. 0,8 / 4 / 20 / 100 / 500 km på tværs.

## Pil en sticker

- Inspireret af brugerens tidligere Daily Jegg.
- Tolv skjulte stickers på en lygtepæl; vælg tre og afslør præmier eller tab.
- Mulige udfald: bananer, gangebonus, Emil-skrig-jackpot og Mikkels knæ som tab.
- Ét spil dagligt, eventuelt streak-bonus. Regler er ikke fastlagt.

## Emiljack og øvrige idéer

- **Roulette — fælles bord**: brugeren er begejstret for hele forslaget om fælles runder og sociale funktioner nedenfor. Navnet er åbent; **Emillette er ikke vedtaget**. Det er stadig en gemt idé, ikke en bestilling på implementering.
  - Samme runde, nedtælling og resultat for alle brugere/enheder, en runde hvert minut. Foreslået rytme: 0–45 sek. placér/ret indsatser, 45–55 sek. låst/spin, 55–60 sek. resultat og gevinst.
  - Serverens ur, rundestatus og resultat er autoritative. Genindlæsning må aldrig give et nyt resultat eller forlænge fristen. Resultatet skal holdes hemmeligt, indtil indsatserne er låst.
  - Indsatser og saldo knyttes til brugeren på tværs af enheder. Anonyme kan kigge med; det kræver en bruger at spille med bananer. Afregning sker præcis én gang, også hvis spilleren lukker appen; debit/indsats og afregning skal være atomiske.
  - Foreslået teknik: klienterne henter små statusopdateringer med få sekunders mellemrum og synkroniserer nedtællingen til servertid. Tidsbaserede runder og afregning ved serverkontakt kan undgå et job hvert minut; faktisk baggrundsafregning uden nogen serverkontakt kræver en særskilt mekanisme. Teknologien er ikke valgt endnu.
  - Socialt: vis deltagere (fx »Mathias, Nicole og 2 andre spiller med«), venners indsatser som jetoner med profilbilleder og seneste resultater. Alle funktionerne er ønskede; foreslået første version er fælles runder, deltagere og egne indsatser, derefter synlige jetoner for venner, med fokus på mobilbrug.
  - Roulettevariant, indsatsgrænser, udbetalinger og badges skal stadig fastlægges.
- Blackjack med Emil som dealer, vennerne som billedkort og eventuelt et særligt Emil-kort.
- Fiktive væddemål om næste stickers land, kontinent eller hvem der sætter den op; kan afgøres ved godkendelse.
- Kosmetik og spilbadges som mulige anvendelser af valuta og aktivitet.

## Markedstest 29. oktober 2026 — modellen er ikke klar til implementering

- Prototype: log-kurs med grundkurstiltrækning (halveringstid 12/24/36 dage), basal daglig støj 5/10/18 % efter risiko, tilfældige regimer på 30–180 minutter (rolig/medvind/modvind/urolig = 50/20/20/10 %). Med-/modvind har log-drift ±10/20/35 % pr. døgn fordelt på minutter; urolig støj ×1,5. Maksimal log-bevægelse pr. minut ±0,01, ekstra negativ log-drift `0.02 * max(ln(kurs/250), 0)^2` pr. døgn, loft 2.500. Disse parametre er afprøvede forslag, ikke vedtagne produktregler.
- Første langtidstest: ét konkret marked med 20 aktier plus 100 ekstra markeder, 2.000 aktieår. Beregnet hvert minut. Maksimum i det konkrete marked 570,45; maksimum i ekstra markeder 2.375,53. 2,3 % af de ekstra aktieforløb nåede 1.000 mindst én gang; ingen ramte 2.500. Udfald er ikke garantier eller en test af handelsøkonomien.
- Opfølgende handelstest med ny seed 20261031: 100 markeder/2.000 aktieår, alle med selvstændig startpung på 1.000 bananer pr. aktie. Brøkaktier, ingen lån/shorts/indbetalinger. Beslutninger hvert 10. minut eksekveres til næste minuts kurs; køb-og-behold og daglig tilfældig eksponering er benchmarks. Slutlikvidation og både købs-/salgsgebyr tæller, også ved tab. Gebyrer 0/0,25/0,5 % pr. side. Ingen fremtidige kurser eller skjulte regimeskift tilgængelige for strategierne.
- Korte perioder: 200 tilfældigt udvalgte slutminutter pr. horisont efter dag 30, på tværs af alle forløb. Vinduer kan overlappe og er ikke uafhængige observationer. Median absolut kursændring for lav/mellem/høj risiko: 10 min = 0,29/0,59/1,02 %; 1 time = 0,74/1,48/2,54 %; 3 timer = 1,32/2,60/4,49 %; 24 timer = 3,71/7,48/12,81 %. Der er allerede tydelig kortsigtet bevægelse.
- **Balanceproblem med fast grundkurs**: køb under 80 % af grundkursen, sælg ved grundkursen, ellers behold til testslut. Median årsafkast efter 0,25 % gebyr pr. side = +144,8/+411,2/+980,7 % (lav/mellem/høj); 99,7/99,7/98,7 % af startpungene endte i plus. Store midlertidige tab forekommer; dette er ikke risikofrit. En variant med 30 % stop-loss og højst 30 dages ejertid løste ikke problemet. 0,5 % gebyr pr. side reducerede kun medianerne til +140,0/+393,0/+923,5 %.
- **Meget hyppig handel straffes hårdt**: køb efter +1 % over sidste time og sælg efter -1 % over sidste time gav ca. 1.418/2.361/3.009 afsluttede handler pr. år (median). Med 0,25 % gebyr pr. side var median årsafkast -99,7/næsten -100/næsten -100 %. Uden gebyr var medianerne positive. Det beviser ikke, at enhver aktiv strategi taber, men gebyret skal passe til det ønskede spiltempo.
- Eksperimentel variant med **flyttende balancepunkt**, ikke godkendt: 50 markeder/1.000 aktieår. Balancepunktets log-kurs vandrer tilfældigt med basal daglig støj 4/7/10 % og trækkes tilbage til den oprindelige grundkurs med halveringstid 365 dage; resten af kursmodellen uændret. Den samme køb-under-80 %-strategi gav median årsafkast +32,8/+151,0/+421,9 % og 75,7/85,4/85,7 % startpunge i plus. Det dæmper problemet, men er stadig en stærk, simpel strategi. Sammenligningen bruger forskellige antal tilfældige forløb, ikke et parret forsøg.
- Konklusion: mere støj er ikke næste skridt. Test af kurser alene er ikke tilstrækkelig; ret modellen for det oplagte købssignal og afstem gebyr/spiltempo, før den samlede bananøkonomi fastlægges. Ingen aktiehandel er bygget i appen endnu.

## Ny kursmodel og gevinstgebyr — næste simulering

- Seneste afprøvning efter brugerens ønske: **ingen tilbagevenden til grundkursen**. Startprisen er kun startpris, ikke en fremtidig salgspris. Stadig tilfældige regimer, gradvist stigende modstand over 250 og loft 2.500, intet fast gulv.
- Gebyrforslag under afprøvning: **gratis køb, 5 % af positiv realiseret gevinst ved salg**, intet gebyr ved tab eller break-even og intet minimum. Gebyret gælder gevinsten, ikke hele salget. Ved flere køb skal gennemsnitlig kostpris bruges ved delvise salg. Fx køb 100, salg 120 → gebyr 1, udbetalt 119; salg 80 → gebyr 0, udbetalt 80. Salgstab refunderer ikke gebyrer på tidligere gevinster.
- Simulering v2, seed 20261101: 100 markeder/2.000 aktieår, samme 20 startpriser/risici. Korrektion `ln(E[exp(clippedNoise)])` fjerner den tilfældige støjs skjulte forventede prisstigning, før trend og øvre modstand tilføjes. Dette er ikke en garanti om neutralitet for hele modellen; vedvarende trends og loft/modstand påvirker den også. Basistøjen begrænses til ±0,01 i log-kurs; trend/korrektion/modstand kommer oveni, så den samlede minutændring er ikke præcis begrænset til 1 %.
- Første v2-variant beholdt støj 5/10/18 % pr. dag og regime-drift ±10/20/35 % pr. dag. Median årsafkast ved køb-og-behold efter gevinstgebyr: **-33,7/-88,8/-99,7 %**. 84,4 % af højrisikoforløbene endte under 10 % af startkursen. Den gamle køb-under-80 %-strategi gav median **0/-74,5/-99,3 %**, og kun **46,2/27,6/12,0 %** af dens startpunge endte i plus. Købsfordelen er væk, men udsvingene er for voldsomme for længere ejertid. Momentum-strategien var stadig stærk på lav risiko (+83,0 % median, 77,8 % i plus), så ingen generel påstand om, at simple strategier ikke kan tjene penge. Tre af 2.000 aktieforløb ramte loftet.
- Dæmpet v2-variant: 50 markeder/1.000 aktieår, støj **2/4/7,2 %** pr. dag og regime-drift **±2/4/7 %** pr. dag. Median årsafkast ved køb-og-behold efter gevinstgebyr: **-5,3/-30,5/-66,9 %**. De midterste 90 % af disse årsafkast var ca. **[-53;+70]/[-80;+170]/[-98;+206] %**. Den gamle dip-strategi gav median **0/0/-32,7 %**, og kun **34,3/42,3/33,7 %** endte i plus. Momentum gav median **-6,5/-23,4/-56,2 %**. Det er kun fem strategier, ikke bevis for fravær af andre vindende strategier. Varianterne bruger forskellige antal tilfældige forløb; sammenligningen er ikke parret.
- Korttidsbevægelse i den dæmpede variant, median absolut kursændring lav/mellem/høj: 10 min **0,12/0,24/0,42 %**, 1 time **0,29/0,57/1,03 %**, 3 timer **0,51/1,01/1,82 %**, 24 timer **1,45/2,92/5,25 %**. Maksimum på tværs af forløbene 843,07; ingen ramte 1.000 eller loftet i dette stikprøveforsøg.
- Metode: all-in/ude, selvstændig startpung på 1.000 pr. aktie, brøkaktier, ingen lån eller ekstra indbetalinger. Beslutninger hvert 10. minut, handel til næste minuts kurs. Gebyr beregnes på hver afsluttet handel og ved slutlikvidation, også på endnu åbne positioner ved periodesnapshots. De kendte strategier må se startpris/kursforløb, men ikke skjulte regimer eller fremtidige kurser. Det er 20 aktiers prisforløb gentaget, ikke én diversificeret portefølje. Korttidsvinduer efter dag 30 kan overlappe. Måneder er 30/90/180 dage.
- Foreløbig konklusion: gratis køb og 5 % gevinstgebyr fjerner problemet med faste gebyrer på små handler. Ingen grundkurs fjerner det gamle sikre salgsmål. Den dæmpede variant er mere lovende, men høj risiko taber stadig ofte meget ved lang ejertid; modellen er fortsat et eksperiment og ikke valgt til produktion. Der er ikke implementeret aktiehandel i appen.

## Afprøvning af langsigtet vækst

- Brugerens næste bestilling er at afprøve en bevidst positiv vækst, ikke at implementere børsen. Tre varianter testes på identiske tilfældige forløb inden for hvert forsøg: **uden vækst**, **beskeden vækst**, **risikokompensation + vækst**. Resten er den dæmpede v2-model: ingen grundkurstiltrækning, køb gratis, 5 % af positiv realiseret gevinst ved salg, gradvis modstand over 250, loft 2.500.
- To forudbestemte seeds 20261101 og 20261102, hver 50 markeder med 20 aktier = 1.000 aktieår pr. variant pr. seed. Seed 2 er kontrolforsøg, ikke brugt til valg af parametre. Varianter er parrede inden for hvert seed. Basisvarianten reproducerede alle tidligere årspercentiler for de fem strategier fra v2-seed 20261101; dette verificerer den optimerede simulationsmotor. Samme næste-minut-eksekvering, ingen fremtidige oplysninger, ingen lån/ekstra indbetalinger og slutlikvidation.
- **Beskeden vækst**: ekstra log-drift `ln(1.08/1.15/1.25) / 525600` pr. minut for lav/mellem/høj risiko. Procentsatserne 8/15/25 % er vækstkomponenten alene, ikke lovet afkast; støj, gebyr, trends og øvre modstand kommer oveni.
- **Risikokompensation**: ekstra log-drift `0.9*quietNoiseLogMoment + 0.1*wildNoiseLogMoment + ln(1.05)/525600` pr. minut. Kompenserer den forventede støjkorrektion i log-kursen og tilføjer et nominelt 5 %-mål. Den ekstra komponent svarer isoleret til ca. 14/46/204 % årligt for lav/mellem/høj, **ikke kun 5 % tilført værdi**. Mål for typisk kurs og gennemsnitlig pengeuddeling er forskellige ting; dette var en diagnostisk variant, ikke en vedtaget regel.
- Kontrolforsøgets median-årsafkast for individuelle køb-og-behold-punge efter gebyr: uden vækst **-10,3/-26,5/-65,4 %**; beskeden vækst **-3,1/-15,5/-56,7 %**; risikokompensation **+2,1/+6,8/+4,2 %**. Første seeds risikokompensation gav median **+7,5/+1,2/-1,1 %**, så udfald varierer. Ingen variant garanterer 5 % afkast.
- Den gamle dip-strategi (køb under 80 % af startkursen og sælg ved startkursen) med beskeden vækst endte i plus i ca. **34–47 %** af forløbene afhængigt af risiko/seed. Der er ikke genfundet den gamle 98–99 %-fordel i disse fem strategier; dette er ikke et bevis for, at der ikke findes andre vindende strategier.
- **Diversificeringskontrol**: genafspilning af seed 20261102, 50 kurve af hver 20 aktier. En samlet startpung på 1.000 fordeles ligeligt i bananer, ingen rebalancering, køb minut 1 og salg efter 365 dage. 5 % af positiv gevinst opgøres pr. aktie, tab modregnes ikke andre aktiers gevinst. Resultater afstemmer præcist med den fulde motors gennemsnit for hver risikogruppe.
- Hele kurvens årsafkast efter gebyr (5./50./95. percentil; gennemsnit; andel i plus): uden vækst **[-36,5; -8,5; +51,8] %; -0,8 %; 20/50**. Beskeden vækst **[-27,2; +4,0; +71,0] %; +13,6 %; 33/50**. Risikokompensation **[+1,9; +50,0; +173,3] %; +69,7 %; 48/50**. Dette er kun 50 kontrolkurve, ikke præcise fremtidige sandsynligheder. Aktierne har uafhængig støj/regimer; der er endnu ingen fælles markedsfaktor, hvilket gør spredning af risiko særlig effektiv.
- Ingen af de testede vækstvarianter ramte loftet 2.500. Risikokompensation nåede maksimalt ca. 1.124,76, beskeden vækst ca. 874,89 på tværs af de to seeds. Rare hændelser kan forekomme uden at være set i disse prøver.
- Foreløbig vurdering: beskeden vækst er et mere rimeligt udgangspunkt for bananøkonomien end fuld risikokompensation. Den løser ikke fuldt ud det store typiske langtidstab på individuelle højrisikoaktier. Risikokompensation retter typisk individuelt årsafkast, men tilfører meget mere valuta og gør en simpel diversificeret kurv meget stærk. Modellen er stadig ikke endeligt valgt eller implementeret.

## Status til næste gang

- Ny brugerønsket funktion på dev: `/rangliste` viser alle registrerede brugere plus tydeligt markerede navne fra stickers, med søgning, brugerfilter og sortering efter point, level, badges, stickers og lande. Adgang fra Spil, stickerlisten og profiler. Bananer afventer valutaen. En lille indikator på Spil-fanen er forberedt til mindst ét tilgængeligt dagligt spil, men er skjult under smugkigget; faktisk tilgængelighed og nulstilling kl. 04 kræver de kommende spil-API'er. At åbne fanen skal ikke fjerne indikatoren.
- Aktie-/casinoarbejdet er gemt til senere. Efterfølgende har brugeren bestilt **design og adgang til siden med daglige spil**; `/spil` er nu et smugkig på dev via en ny Spil-fane i bundmenuen. By-gættespil og lykkehjul har illustrationer og beskrivelser i paneler. Ingen faktiske spil, belønninger eller saldi er implementeret. Mere simulering og rigtig spilfunktionalitet er ikke bestilt endnu.
- Arbejd videre fra den dæmpede model med beskeden vækst som foreløbig kandidat; den er ikke endeligt godkendt. Afklar især individuelle højrisikoaktiers langtidstab, fælles markedsbevægelser og hvor meget valuta børsen må tilføre.
- Simulationskode, input og sammenfattede resultater er arkiveret i [`docs/experiments/market-growth/`](experiments/market-growth/), så de følger repoet til andre pc'er. Timekurver er udeladt fra de arkiverede resultater; de kan genskabes med koden. Python med NumPy kræves. Kør `python docs/experiments/market-growth/simulate-market-growth.py --seed 20261101 --reps 50` og tilsvarende med seed `20261102`, derefter `python docs/experiments/market-growth/check-growth-portfolios.py`. Filer genereres ved siden af scripts. Det er analyseværktøjer, ikke appens marked.
