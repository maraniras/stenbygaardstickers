# Juleopdatering – mobiltest 10. november 2026

Testet i appens browser ved 390×844 og 320×640, i det valgte mørke tema. Dette er responsive browsertests, ikke tests på en fysisk iPhone/Android. Alle spilhandlinger, tilmeldinger, gaveåbninger, gaveafsendelser og udleveringsklik blev udført i eksplicit lokal testvisning med fiktive data, uden rigtige præmier, betaling eller push.

## Gennemgået

| Område                    | Resultat                                                                                                                                                                              |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pakkeleg: tilmelding      | Regler åbne, pris 100, frist 26/11 og start 27/11 kl. 04. Testtilmelding viser bekræftelse og øger puljen fra 6 til 8 gaver.                                                          |
| Pakkeleg: terning og valg | Testsekser viser animation, bruger ét af to slag, aktiverer midtens pakker og viser valgdialog. Bekræftet gave flytter til eget bord.                                                 |
| Pakkeleg: slut og åbning  | Uåbnede gaver forbliver indpakkede. Åbning viser ikon, grønne bananer og fysisk præmie. Tilbageknappen virker; ejerens opsummering opdateres.                                         |
| Lille gavevisning         | Ved 320×640 ligger tilbageknappen inden for skærmen (bottom 596px), uden vandret rulning.                                                                                             |
| Deltagere                 | Én kolonne ved 390px. Andre spilleres uåbnede gaver afslører ikke indhold.                                                                                                            |
| Julekalender              | Almindelig låge og dobbeltdøren 24 åbner, zoomer og viser fund. Tilbage går til kalenderen.                                                                                           |
| Kalenderfund              | Mine fund viser Faxe Kondi +50 og registreret testgave til Mathias.                                                                                                                   |
| Vennegave                 | Modtagervælger udelader egen bruger; bekræftelse viser testmodtager og sender intet rigtigt.                                                                                          |
| Julebillede               | Modal fremstiller hele julebilledet og en aktiv Hent billede-link med Blob-URL. Ingen fil blev hentet under testen.                                                                   |
| Datolåse                  | Datolås-visning har låste kalenderlåger og 1/12 kl. 04-tekst. Dagens bokse viser 20/11 kl. 04 og deaktiverede bokse. Produktions- og tidsgrænser dækkes desuden af automatiske tests. |
| Øvrig navigation          | Spil, kort, stickers, rangliste og egen profil indlæser ved 320px uden vandret rulning. Ingen manglende billeder i de kontrollerede kalender-, admin- og gavevisninger.               |
| Admin Pakkeleg            | Ved 390px og 320px: flere præmier til samme vinder, uåbnet gave, udleveret gave og gave uden vinder. Testklik markerer og fortryder udlevering uafhængigt pr. gave.                   |

Ingen blokerende visuelle fejl fundet i disse flows. Browserens viewport-override blev nulstillet efter testen. Push på fysiske telefoner, rigtige gaveudleveringer og produktionens fremtidige lodtrækning er ikke udført under denne gennemgang.

## Automatiske kontroller

241 tests bestod inklusive fire nye admin-tests. Typecheck, lint og Vercel-build bestod. Både GET- og POST-adminruten returnerede desuden HTTP 401 uden admincookie på den lokale server. Admin-tests dækker login før læsning, ingen skjulte vindere/indhold før slut, serverbestemt modtager, flere samtidige udleveringer, genforsøg, fortrydelse samt uændret saldo og historik. Logs: `.data/parcel-admin-all-tests.log`, `.data/parcel-admin-typecheck.log`, `.data/parcel-admin-lint.log` og `.data/parcel-admin-build.log`.

Skærmbilleder: `.data/admin-pakkeleg-mobile-final.png`, `.data/calendar-finds-mobile-qa.png` og `.data/parcel-mobile-opening-qa.png`.
