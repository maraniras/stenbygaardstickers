# Versionering

Nye udgivelser bruger X.Y.Z.W:

- X: stor opdatering.
- Y: større ny feature.
- Z: minor.
- W: hotfix.

Ved ændring af et led nulstilles de efterfølgende led. Eksempler: 2.10.1.0 er en minor, 2.10.1.1 er en hotfix, 2.11.0.0 er en større feature og 3.0.0.0 er en stor opdatering.

Hotfixes sender ikke opdateringspush. Andre udgivne versioner sender én deduplikeret opdateringspush. Kladder uden dato annonceres ikke. Historiske to- og treleddede versionsnumre bevares; gamle treleddede hotfixes forbliver uden push. Gemte versionsrangeringer i Redis og lokale læsekvitteringer er fortsat kompatible.
