# Bananditten – syv hjulmotiver

2. november 2026. Genereret med den indbyggede image_gen og `transparent_background: true`. Det første sæt findes i [prompts.json](prompts.json). Brugerens ændring fra skrællet banan/bananbundt til Balconi Mix Max/Faxe Kondi er beskrevet i [prompts-v2.json](prompts-v2.json). PNG-originalerne er gemt i denne mappe. De er visuelt kontrolleret, også samlet på lys og mørk baggrund.

Optimerede transparente 384 × 384 WebP-filer ligger i `public/games/bananditten/`. Sharp er kun brugt til alpha-bevarende trimning, skalering, padding, komprimering og opsætning af oversigten. Alle syv originaler har alpha med helt transparente pixels; alle syv WebP-filer har alpha og samme dimensioner.

| Fil | Motiv | Foreslået rolle |
|---|---|---|
| limoncello | Limoncello-flaske (internt ID `lemon`) | 5× |
| strawberry | Jordbær | 2× |
| mix-max | Balconi Mix Max | 10× |
| faxe-kondi-bottle | Faxe Kondi-flaske (internt ID `faxe-kondi`) | 25× |
| crowned-banana | Guldbanan med lilla/guld-krone | Jackpot 100× |
| banana-peel | Tom bananskræl | Fyldmotiv |
| heineken-00 | Heineken 0.0-dåse (internt ID `banana-leaf`) | Fyldmotiv |

[index.html](index.html) viser motiverne enkeltvis og følger systemets farvetema. [oversigt.png](oversigt.png) og [oversigt-lys.png](oversigt-lys.png) viser alle syv samlet. Gevinstmærkaterne er designoplæg; spil, odds og badgefunktioner er ikke implementeret i denne designændring.

De tidligere PNG-originaler `peeled-banana.png` og `banana-bunch.png` er bevaret som designarkiv. De to tilhørende WebP-filer er erstattet af motiverne ovenfor.

5. november 2026: Citronen er erstattet af en limoncello-flaske, genereret med den indbyggede image_gen og transparent baggrund. Original: `limoncello.png`, prompt: `prompt-limoncello.json`. Sharp er brugt til trimning, skalering og WebP-komprimering. Jordbær og limoncello giver nu henholdsvis 2× og 5×; odds pr. multiplikator og RTP på 94 % er uændrede. Det interne ID `lemon` bevares for eksisterende gemte spins, mens alle aktive billeder bruger `limoncello.webp`. De gamle citronfiler og oversigtsbilleder bevares som designarkiv.

Visuel emballagereference: [Balconi Mix Max Classic](https://www.cerinicoffee.com/products/balconi-mix-max-classic) og [Faxe Kondi 33 cl](https://fsgfoods.dk/produkter/faxe-kondi-33cl-dase). Motiverne er genererede 3D-fortolkninger, ikke genbrugte produktfotos.

5. november 2026: Bananbladet er erstattet af en Heineken 0.0-dåse, tydeligt markeret alkoholfri. Genereret med indbygget image_gen med transparent baggrund; original heineken-00.png og prompt-heineken-00.json er gemt her. 384x384 WebP er trimmet og skaleret med sharp. Det interne ID banana-leaf bevares for eksisterende spins og mappes til heineken-00.webp. Det er stadig et fyldmotiv og kan indgå sammen med et par for at give indsatsen tilbage. Odds og RTP ændres ikke. Gamle bananblad-filer bevares som designarkiv.

5. november 2026: Faxe Kondi-dåsen er erstattet af en grøn 500 ml-flaske med smal hals og skruelåg, så silhuetten er tydeligt forskellig fra Heineken 0.0-dåsen. Genereret med indbygget image_gen og transparent baggrund; original faxe-kondi-bottle.png og prompt-faxe-kondi-bottle.json er gemt her. Optimeret WebP er 384x384 med alpha. Internt ID faxe-kondi og gevinst på 25x bevares. Gamle dåsefiler bevares som designarkiv.
