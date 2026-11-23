# På Tværs: Doomsday Special

Det accepterede layout fra samtalens preview v28 er importeret til
`server/data/crossword-marvel.ts`: 128 ord, 460 forskellige bogstavfelter og 171
krydsninger. Facit ligger kun på serveren. De seks vedhæftede billeder ligger i
`public/games/crossword/marvel/`. Daredevil-feltet er 4 × 4 uden tekst.

Den godkendte badge er gemt som `winner.png` her og som transparent 256 px WebP i
`public/badges/custom/crossword-marvel-winner.webp`. Den er x117 i badgekataloget.
Motivet er den originale maskerede gådemester med sølvmaske, mørkegrøn kappe,
grøn ild/røg og sølvkrans. Nederst er en hvid stjerne med blå midte og brede
rød/hvid/røde ringe. Artwork er skabt med det indbyggede billedværktøj og valgt af
brugeren.

## Drift og admin

- Admin → Krydsord → Doomsday Special: separat starttid i dansk tid, pushstatus,
  facit, deltageres gemte løsninger og forhåndsvisning uden præmier.
- Spillet ligger under Øvrige. Indhold og indsendelse er låst indtil start;
  nedtælling vises tidligst 48 timer før.
- API og admin bruger `id=marvel`. Krydsord #1 beholder `id=1` og sin eksisterende
  Redis-post. Marvel gemmes separat i hashfeltet `marvel` i `crossword-games`.
- Første servergodkendte løsning får 500 bananer, badgen og den eksklusive profilramme. Øvrige registrerede
  brugere får 50 bananer for at gennemføre. Betalinger har varige kvitteringer og
  kan genoptages ved næste kald efter en afbrudt udbetaling.
- Push ved annoncering, 24 timer før, én time før, åbning og vinder genbruger
  QStash-systemet med særskilte nøgler og links for hvert krydsord.
- Første hjælp er åbningsdagen plus én hel ekstra dag, derefter kl. 04 dansk tid.
- Backups indeholder både den eksisterende `crossword` og `crosswords.marvel`.
- Admins julemenupunkt er synligt 1. november til og med 15. januar, dansk tid.

Profilrammen kan vælges i indstillinger og sættes automatisk på, hvis vinderen ikke har en ramme.

Ingen starttid er valgt som del af implementeringen. Intet er udgivet på drift.

Vinderens profilbanner (`winner-banner.webp`) vises bag brugerens kort på ranglisten og øverst på profilen. Vinderen får ejerskab til banneret og kan vælge det eller fjerne det under Dine profilbannere. Visningen følger brugerens valgte banner, uafhængigt af profilrammen.
