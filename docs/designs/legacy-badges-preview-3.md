# Prøvesæt 3: rejser og fællesskab

Genereret med den indbyggede image_gen den 30. oktober 2026. Seks separate PNG-motiver med original alpha findes i `docs/designs/legacy-badges-preview-3/`. Alle seks er nu i brug som WebP-filer i `public/badges/custom/`. Badgereglerne er uændrede; Hele banden bruger den forenklede udgave beskrevet nedenfor.

## Fælles prompt og referencer

Identity reference: `branding/logo.png`. Style reference: `docs/designs/legacy-badges-preview-2/oversigt.png`. One image_gen call per motif with transparent_background=true.

Use case: stylized-concept. One premium achievement icon for Stenbygaard Stickers. Preserve Emil's recognizable brown-haired shouting profile and expression from the exact supplied face as the printed face on stickers/props. Match detailed playful polished 3D, tactile vinyl/enamel, warm gold/brass and purple with mint accents, soft studio lighting. New standalone motif, not a board. Fully contained square with 8 percent transparent padding and strong silhouette readable at 64px. Genuine alpha. No typography, letters, digits, watermarks, background rectangle, floor shadow or outer medal ring. No generic replacement face. No hands or human bodies unless specifically requested.

## Motiver

| Nr. | Fil | Badge | Specifik motivprompt |
|---|---|---|---|
| x26 | gang.png | Hele banden | Four separate thick cream-edged Emil head stickers in a cheerful chaotic group-photo arrangement. Exactly four recognizable shouting faces, staggered and tilted in two rows, with purple, mint, gold and blue backing accents. No bodies or extra faces; all four heads fully visible. |
| x5 | network.png | Netværk | Bold central cream-edged Emil sticker, curved gold/mint connectors to four smaller separate Emil sticker nodes around it. Compact hub-and-spoke social network, rounded connectors, gold junctions, purple/mint node backing. Large central face dominates, clearly separate outer nodes, no tangled web or generic profile silhouettes. |
| x22 | roadtrip.png | Roadtrip | Small purple road-trip car, three-quarter view, brass trim, mint glass, recognizable shouting Emil in open side window. Two suitcases safely strapped to roof. Short winding dark road with cream dashed markings curls beneath. No human limbs or license plate text. |
| x23 | longhaul.png | Langtur | Purple travel suitcase, gold corners, large Emil sticker on front. Small white/gold passenger plane arcs behind and above along a long curved mint/gold route. Tiny gold globe clasp. Suitcase dominates, airplane fully visible/recognizable, compact medal silhouette. No writing or flags. |
| x30 | border.png | Grænsehopper | Emil head sticker with two tiny cartoon sneaker feet mid-hop over lowered red/cream striped border barrier. Small purple passport with gold globe symbol tucked against sticker edge. Gold barrier base, mint motion accent. Only two feet, no human body or extra heads, passport symbol only. |
| x19 | nordic.png | Nordisk mester | Compact Nordic diorama: two snowy mountains, dark mint pine trees, blue fjord, high green/turquoise aurora ribbon. Cream-edged Emil sticker prominently at front. Purple rocky base with subtle gold trim, cool fresh palette. Genuine transparent sky outside aurora, no scenery rectangle, flags or writing. |

`oversigt.png` sætter de seks genererede originaler op med navne på en fælles baggrund til sammenligning. `index.html` viser dem enkeltvis og linker til originalerne.

## Finpudsning af Hele banden

Den første generering tilføjede elementpynt fra stilreferencen. En separat image_gen-redigering præciserer motivet: preserve exactly the four faces, expressions, orientation and clustered two-row positions; remove all fire/sun, ice crystals, bubbles, lightning, sparks and splash motifs; replace with simple narrow smooth purple, mint, warm-gold and blue vinyl backing rims and cream die-cut sticker edges. Keep curled edges, no added objects, no bodies/hands, genuine alpha. Resultatet skal ligne en samlet bunke stickers.
