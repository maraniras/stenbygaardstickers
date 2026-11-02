# Bananditten – syv hjulmotiver

2. november 2026. Genereret som syv separate kald med den indbyggede image_gen og `transparent_background: true`. Det fulde fælles prompt og de syv motivspecifikationer findes i [prompts.json](prompts.json). PNG-originalerne er gemt i denne mappe. De er visuelt kontrolleret, også samlet på lys og mørk baggrund.

Optimerede transparente 384 × 384 WebP-filer ligger i `public/games/bananditten/`. Sharp er kun brugt til alpha-bevarende trimning, skalering, padding, komprimering og opsætning af oversigten. Alle syv originaler har alpha med helt transparente pixels; alle syv WebP-filer har alpha og samme dimensioner.

| Fil | Motiv | Foreslået rolle |
|---|---|---|
| lemon | Citron | 2× |
| strawberry | Jordbær | 5× |
| peeled-banana | Skrællet banan | 10× |
| banana-bunch | Bananbundt | 25× |
| crowned-banana | Guldbanan med lilla/guld-krone | Jackpot 100× |
| banana-peel | Tom bananskræl | Fyldmotiv |
| banana-leaf | Bananblad | Fyldmotiv |

[index.html](index.html) viser motiverne enkeltvis og følger systemets farvetema. [oversigt.png](oversigt.png) og [oversigt-lys.png](oversigt-lys.png) viser alle syv samlet. Gevinstmærkaterne er designoplæg; spil, odds og badgefunktioner er ikke implementeret i denne designændring.
