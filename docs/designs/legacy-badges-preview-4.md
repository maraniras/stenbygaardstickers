# Prøvesæt 4: kontinenterne

Genereret med den indbyggede image_gen den 30. oktober 2026. Seks separate PNG-motiver med original alpha findes i `docs/designs/legacy-badges-preview-4/`. Alle seks er nu i brug som WebP-filer i `public/badges/custom/`. Tier-kanter og badgeregler er uændrede.

## Fælles prompt og referencer

Identity: `branding/logo.png`. Style only: `docs/designs/legacy-badges-preview-3/nordic.png`. One image_gen call per motif, transparent_background=true.

Use case: stylized-concept. One premium 3D continent achievement icon for Stenbygaard Stickers, part of a cohesive six-continent diorama set. Preserve Emil's recognizable brown-haired shouting profile as one cream-edged sticker prominently at front left. Richly detailed miniature landscape, tactile purple rocky island base edged in warm gold, lush materials and soft studio lighting. Same compact oval floating island base, similar composition/scale across all six: landscape behind, one face roughly one third of icon, scenery still readable. Strong silhouette readable at 64px, fully contained with 8 percent transparent padding. Genuine alpha outside standalone diorama, including empty sky. No rectangular sky, outer medal frame, text, digits, watermark, extra faces, costumes or human caricatures. Do not copy the Nordic aurora/fjord/mountains unless requested in the individual subject.

## Motiver

| Nr. | Fil | Badge | Specifik motivprompt |
|---|---|---|---|
| x8 | continent-europa.png | Europa | Temperate green European miniature, stone castle behind, elegant old arched stone bridge over blue river, small cream/purple passenger train winding through green hills. Warm daylight, mossy stone, spring greens. Distinct castle/bridge/train, not overpacked city. |
| x9 | continent-afrika.png | Afrika | Golden savanna, one flat-canopy acacia, one small proud lion resting front right, warm golden sun disk behind tree without opaque sky. Amber/ochre/olive green, tactile grasses. Recognizable lion, no extra animals. |
| x10 | continent-asien.png | Asien | Red/gold tiered pagoda, delicate pink cherry blossom branch framing upper side, one traditional long gold serpentine dragon curling behind as sculpted ornament. Blue stream, mint garden rocks, red/pink/jade palette. Pagoda is scenery hero, dragon supports, do not obscure Emil. |
| x11 | continent-nordamerika.png | Nordamerika | Small modern skyline, red sandstone mesa to one side, short winding dark highway with cream dashed markings leading toward city. Sapphire glass, terracotta rock, muted desert green, warm daylight. Clearly distinct skyline/mesa/highway, no flags or writing. |
| x12 | continent-sydamerika.png | Sydamerika | Andes behind stepped Inca agricultural stone terraces with small ruins, emerald rainforest edge, one red/blue/yellow macaw perched front right, blue stream. Grey stone/turquoise/emerald palette, clear carved terrace steps, no pagodas or Nordic pines. |
| x13 | continent-oceanien.png | Oceanien | One friendly realistically proportioned kangaroo on sand front right, sculpted turquoise surf wave behind, small purple/gold surfboard and pink/orange coral cluster at water edge. Sunny cream sand/teal/coral, recognizable long tail and large hind feet, no extra animals. |

Alle seks bruger fælles lilla/guld-base og Emil foran til venstre. `oversigt.png` er en sammenligning med navne; originalerne bevarer gennemsigtig baggrund. `index.html` viser hver enkelt og linker til originalerne.
