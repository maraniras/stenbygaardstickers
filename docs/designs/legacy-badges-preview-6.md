# Sæt 6: kommentarer og reaktioner

Genereret med den indbyggede image_gen den 30. oktober 2026. Kilder med original alpha i `docs/designs/legacy-badges-preview-6/`, optimerede appikoner i `public/badges/custom/`. Brugerens præference er nu at installere nye badgemotiver direkte, efter visuel kontrol, uden et separat godkendelsestrin. Regler, navne, point, belønninger og tier-kanter bevares.

## Fælles prompt og referencer

Identity: `branding/logo.png`. Material/style only: `docs/designs/legacy-badges-preview/favorite.png`. One image_gen call per motif, transparent_background=true.

Use case: stylized-concept. One production-ready 3D achievement icon for Stenbygaard Stickers, cohesive social collection. Preserve recognizable brown-haired shouting Emil profile as printed face on cream-edged sticker. Polished rich purple enamel, warm gold/brass, cream/mint accents, tactile playful 3D, soft studio lighting. Reference is style/material only, not composition. New standalone motif, uncluttered silhouette readable at 64px, square contained with 8 percent transparent padding. Genuine alpha, no background rectangle, floor shadow, outer medal ring, digits, watermark or writing except required @ symbol. Only one Emil face, no full human bodies. Comment bubbles are rounded purple with gold edging and a clear tail.

## Motiver

| Nr. | Fil | Badge | Specifik motivprompt |
|---|---|---|---|
| x51 | commenter.png | Første kommentar | Large purple/gold speech bubble with prominent cream-edged Emil print, small diagonal gold pencil, tiny fresh mint bubble popping behind. No thumbs, written message or letters. Bold bubble/pencil silhouette. |
| x52 | tagged.png | Tagget | Dominant large sculpted warm-gold correctly formed @, small Emil sticker dangling on tiny purple/gold name-tag attachment, compact purple speech bubble at lower side. No other letters, digits, thumbs or extra face. |
| x53 | likes.png | Likes | Purple/gold comment bubble, one gold thumbs-up hand emerging above, three small mint/gold heart reaction tokens, small Emil sticker on front. One hand/one face, no stars/writing. Distinct from five-hand fan and tower. |
| x54 | hit.png | Hit | Purple/gold comment bubble with Emil bursts through tiny cream-brick wall fragment, compact gold/mint comic impact burst, few chunky brick fragments. Bubble breaking through, celebratory comment success, no building/rubble/weapons/text/stars/thumbs. |
| x55 | viral.png | Viral | One large Emil comment bubble sends curved luminous mint/gold spreading connectors to four smaller empty speech bubbles, two each side. Smaller bubbles carry only abstract cream message lines, no faces/writing. Clear outward spread, not tangled web, no thumbs. |
| x49 | fivestar.png | Fuld hånd | Exactly five distinct sculpted gold thumbs-up hands in symmetrical fan: top center, two middle left/right, two lower left/right, purple cuffs. Small Emil sticker centered at bottom in front of wrists. Five readable gestures dominate, no knot, open palm, vertical tower, stars or text. |

`oversigt.png` og `index.html` samler sættet til visning. Originalerne bevares. Installer med `node scripts/install-badge-art.mjs docs/designs/legacy-badges-preview-6`; `badgeIcon()` vælger appfilerne.
