# Prøvesæt 5: hjemmebane og opdagelser

Genereret med den indbyggede image_gen den 30. oktober 2026. Seks separate PNG-motiver med original alpha i `docs/designs/legacy-badges-preview-5/`. Alle seks er nu i brug som WebP-filer i `public/badges/custom/`. Badgeregler og tier-kanter er uændrede.

## Fælles prompt og referencer

Identity: `branding/logo.png`. Style only: `docs/designs/legacy-badges-preview-3/oversigt.png`. One image_gen call per asset, transparent_background=true.

Use case: stylized-concept. One standalone premium 3D achievement icon for Stenbygaard Stickers. Preserve Emil's recognizable brown-haired shouting profile as a detailed printed face on a cream-edged sticker or prop. Match richly detailed playful polished 3D objects, tactile enamel/vinyl, purple, warm gold/brass, cream and mint accents, soft studio lighting. New motif; do not copy objects or multi-face layouts from the style board. Square fully contained composition, 8 percent clear transparent padding, strong silhouette readable at 64px. Genuine alpha, no background rectangle, baked sky, floor shadow, outer medal ring, typography, digits, labels or watermark. No extra bodies/faces; one Emil face unless specified.

## Motiver og specifikke prompts

| Nr. | Fil | Badge | Motivprompt |
|---|---|---|---|
| x16 | home.png | Hjemmebane | Small freestanding Danish red-brick wall, one large Emil sticker stuck to front, small correct red/white Dannebrog on short pole beside wall, little rounded red Danish-style mailbox at side. Tactile brick/brass, subtle purple foot. Not an entire house/city, no writing or postal logos. |
| x27 | regular.png | Stamkunde | Worn cork noticeboard, chunky purple frame, two recognizable Emil stickers pinned at different corners, dominant curved gold circular return arrow around board side. Cork texture, small gold pins, curled edges. Exactly two faces, no words/numbers/travel objects. |
| x31 | team.png | Holdspiller | Two small cartoon hands from left/right cooperatively apply one Emil sticker to upright mint panel. Left holds upper corner, right smooths lower side. Face remains visible, curled vinyl edge, purple/mint sleeves with gold cuffs. Hands only, no bodies/second face, simple correct fingers. |
| x2 | cities.png | Byer | Tiny city cluster on purple/gold base, three distinct rounded buildings in mint/cream/lavender, varied heights and awning. Gold pins between rooftops. One prominent Emil sticker on front building, tiny cream sticker corners on other buildings without additional faces. Clear skyline, no lettering/flags. |
| x3 | countries.png | Lande | Open tactile purple passport, cream pages, large printed Emil passport portrait on one page, abstract colorful globe/pin/airplane stamp symbols on other. No words/dates/numbers. Small white/gold airplane arcs above. Gold binding, mint accents; passport dominates. |
| x6 | capitals.png | Hovedstæder | Small elegant capital diorama, grand cream civic building with central gold dome, symmetrical columns/steps, large gold pin behind, Emil sticker front left, a few mint miniature trees. Purple/gold base, regal diplomatic feel, clear dome/columns/pin silhouette. No flags, lettering or extra faces. |

`oversigt.png` samler de seks originaler med navne på fælles baggrund. `index.html` viser dem individuelt og linker til PNG-originalerne med gennemsigtig baggrund.
