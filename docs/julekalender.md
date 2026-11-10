# Julekalender 2026

Implementeret lokalt på dev 7. november 2026. Endnu ikke udgivet på prod.

## Fund

| Fund              |            Bananer | Ekstra                 |
| ----------------- | -----------------: | ---------------------- |
| En enkelt banan   |                 25 |                        |
| Lille bunke       |                100 |                        |
| Stor bunke        |                250 | Mindst to pr. kalender |
| Drillenisse       |                −75 | Saldo stopper ved nul  |
| Mix Max           |                250 | En rigtig Mix Max      |
| Rødvin / hvidvin  |                  0 | En rigtig flaske       |
| Cykeldrikkedunk   |                  0 | En rigtig dunk         |
| Faxe Kondi        |                 50 | En rigtig flaske       |
| Træstammer        |                 50 | Fysisk kagepræmie      |
| Julemand          |              2.500 | Én person i alt        |
| Gave til en ven   | 100 til modtageren | Betales af kalenderen  |
| Gave til sig selv |                150 |                        |

Julepyntede transparente ikoner: public/games/advent/. Originaler og tidligere udgaver: docs/designs/advent-rewards/.

## Fordeling og datolås

- Kalenderkortet under Spil vises fra 24. november kl. 04.00 dansk tid, også lokalt. Selve testkalenderen kan stadig åbnes direkte lokalt. Rigtige låger åbner fortsat fra 1. december kl. 04.00.

- 24 personlige låger. Almindelige bananfund vægtes 55/35/10 før garanterede fund placeres.
- Alle får 1–5 drillenisser (15/40/30/10/5 procent); Norsk får præcis syv.
- Alle får 1–3 vennegaver og 1–3 egne gaver, ligeligt fordelt mellem antal.
- Globalt: fem Mix Max, én rødvin, én hvidvin, to drikkedunke, to Faxe Kondi-flasker og én julemand. Separat lodtrækning for hver præmie; samme person må vinde flere.
- Én ekstra træstammegave + 50 bananer, kun hvis Ida eller Marc er på deltagerlisten. Kun disse to navne (uden forskel på store/små bogstaver) kan vinde den. Hvis begge er med, trækkes én af dem; hvis ingen er med, udelades gaven. Placering er tilfældig fra 10. til og med 18. december.
- Mathias og Tobias Frost er udelukket fra fysiske præmier og julemanden. Emil desuden fra drikkedunke, men ikke vin eller Mix Max.
- Deltagerlisten: oprettet før 1. december 2026 kl. 00.00 dansk tid. Fryses først efter fristen. Senere konti får almindelig kalender uden begrænsede præmier.
- Vin kun i låge 23/24. Flere fund kan ligge i samme låge uden at fjerne garanterede nisser/gaver eller to store bunker.
- Privat servergemt lodtrækning og planer medtages i backup. Genindlæsning, flere enheder og åbningsrækkefølge ændrer ikke udfald.
- Rigtige låger åbner 1.–24. december kl. 04.00 dansk tid. Missede låger kan åbnes senere. Åbning og udbetaling gemmes atomisk én gang pr. bruger/år/dag.
- Testvisning viser alle fund uden saldoændringer, præmiekrav, gaveafsendelser eller push.

## Gaver og beskeder

Gaveknappen står ved siden af Mine fund i hele kalenderen, så længe en åbnet vennegave endnu ikke er leveret. Den afhænger ikke af den valgte låge; flere gaver kan vælges efter lågenummer i modalen. Når alle er givet, forsvinder knappen. Genindlæste rigtige åbninger og låste modtagere efter leveringsfejl er også med.

Testvisning har også gavevælgeren: låge 8, 15 og 20 indeholder prøvegaver. “Giv testgaven” åbner en modal, hvor man vælger en anden registreret bruger. Modtageren huskes kun i den aktuelle testkalender og vises under Mine fund; Nulstil rydder testgaverne. Der kaldes intet gave-API, bruges intet bruger-token og sendes hverken bananer eller notifikationer.

En vennegave viser en modtagervælger uden mulighed for at vælge sig selv. Modtager låses før overførslen; genforsøg giver ikke dobbelt betaling. Modtager får saldo, historik, ulæst besked ved næste åbning og push efter sine indstillinger. Ulæste gaver samles. Offline lukning huskes lokalt indtil serverkvitteringen lykkes.

## Badges

x89–95: Lågejæger (1/6/12/18/24 i samme år), Gavmild nisse, Nogen tænkte på dig, Selvforkælelse, Nissen har set dig, Julemandens favorit, Noget under træet. Alle giver 1 point pr. badge/trin og 20 bananer via almindelig badgepolitik. Højst 11 point og 220 bananer. Glædelig jul-badgen er fravalgt; kalenderoverskriften bevares.

## Kalender og overblik

Den diskrete knap Se julebilledet nederst åbner hele baggrundsbilledet i en modal uden låger. December 2026, Glædelig jul og Og godt Stenbygaard er indtegnet øverst. Hent billede downloader samme visning som stenbygaard-jul-2026.png i originalens 942×1670 opløsning. Canvas dannes kun ved åbning, lokalt i browseren; midlertidige billed-URL'er frigives ved lukning.

Første åbning spiller en kort fund-animation: bananer popper frem, drillenissen snupper bananer, egne/vennegaver får gavemotiv, og julemanden/fysiske præmier fejres med konfetti. Genåbning af en allerede fundet låge spiller ikke effekten igen. Reduceret bevægelse respekteres; tilbage/nulstilling/navigation afbryder effekten uden at ændre præmien.

Admin kan markere hver fundet fysisk præmie som udleveret og rette den tilbage til afventer. Dato gemmes pr. lodtræknings-id i åbningens deliveries, så to Mix Max i samme låge stadig kan håndteres hver for sig. Lågens samlede fulfilment er først delivered, når alle dens fysiske præmier er udleveret. Status vises også på brugerens fundoversigt. Opdateringer sker i kontoens CAS uden ændring af bananer eller præmier. Uåbnede præmier kan ikke markeres som udleveret.

Admin → Julekalender viser én række pr. fysisk præmie med vinder, låge og åbningsdato. Status skelner mellem tildelt, endnu uåbnet præmie og fundet præmie, som afventer udlevering. Gentagne vindere og flere præmier i samme låge bevares som separate rækker. Før lodtrækningen vises fristen og præmieantallene; læsning af adminoversigten foretager aldrig en lodtrækning eller åbning. Opdatér henter nyeste status.

Hele christmas-calendar-final-v3.webp vises uden beskæring. Numre er blandede; 1–12 undgår ansigter. Låge 24 er dobbeltdør. Åbnede låger beholder fundets ikon. Mine fund åbner en modal med åbninger, ekstra præmier og samlet faktisk bananændring fra lågerne; badgebonus og modtagne gaver tælles separat i lageret. Testvisning viser kun egne prøveåbninger.

## Idéer, endnu ikke valgt

Nisseværn, julepynt til profil, stickerpakke, snebold til en ven og tom gave med trøstepræmie.
