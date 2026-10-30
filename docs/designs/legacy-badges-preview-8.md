# Sæt 8: rejser og geografiske rekorder

Genereret med den indbyggede image_gen den 30. oktober 2026. PNG-originaler med alpha og galleri gemmes i `legacy-badges-preview-8/`. Appen bruger WebP-filer i `public/badges/custom/`, installeret efter visuel kontrol med `node scripts/install-badge-art.mjs docs/designs/legacy-badges-preview-8`. Regler, navne, point, belønninger og tier-kanter bevares.

## Fælles prompt og referencer

Use case: stylized-concept. ONE standalone 3D achievement icon for Stenbygaard Stickers. Identity reference `branding/logo.png`: recognizable brown-haired shouting Emil profile printed on cream-edged sticker, one face total. Material/style reference ONLY `legacy-badges-preview-7/photographer.png`, not camera composition. Rich glossy purple enamel, warm gold/brass, cream/mint accents, polished tactile playful 3D, soft studio light. Bold compact silhouette readable at 64px, square contained with 8% clear padding, genuine transparent alpha. No floor, backdrop, extra medal ring, writing, digits, watermark. Separate image_gen call per asset, transparent_background=true.

| Nr. | Fil | Badge | Specifik motivprompt |
|---|---|---|---|
| x7 | continents.png | Kontinenter | Purple-ocean mint-land globe with recognizable simplified continents, fine golden connections and three gold nodes. Emil sticker lower right front. Globe dominant, no transport or flags. |
| x18 | neighbour.png | En ægte nabo | Three cozy houses behind short shared cream fence, central Emil sticker. Swedish blue house with blue/yellow cross flag, Norwegian red house with red/navy cross outlined white flag, German cream house with black/red/gold flag. No Denmark flag or people. |
| x28 | far.png | Langt hjemmefra | Purple/gold suitcase with Emil sticker and visible handle. Tiny remote cream house upper left, one long curved dotted gold route with mint endpoint. No globe, rocket or airplane. |
| x29 | world.png | Ud i verden | Purple/gold rocket bearing Emil sticker, angled upper right orbiting small mint/purple Earth, one clean gold orbit arc, compact gold/mint flame. No stars, compass, suitcase or house. |
| x62 | north.png | Nordligst | Round gold pocket compass, purple dial, gold needle with icy mint highlighted tip pointing UP. Small Emil sticker lower rim, icy mountain behind upper left. No letters, ticks, palm, sun or bear. |
| x63 | south.png | Sydligst | Matching round gold compass, purple dial, gold needle with amber highlighted tip pointing DOWN. Emil sticker upper left leaves tip visible, palm behind upper right, gold sun upper left. No letters, ticks, mountain, ice or snow. |

`oversigt.png` og `index.html` samler sættet. Appen tegner medaljekanterne separat; originalerne bevares.
