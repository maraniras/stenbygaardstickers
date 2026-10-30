# Sæt 10: de sidste otte motiver

Genereret med den indbyggede image_gen den 30. oktober 2026. PNG-originaler, oversigt og galleri ligger i `legacy-badges-preview-10/`. Appen bruger WebP-filer i `public/badges/custom/`, installeret efter visuel kontrol med `node scripts/install-badge-art.mjs docs/designs/legacy-badges-preview-10`. Badgeregler, navne, point, belønninger og medaljekanter bevares.

## Fælles prompt og referencer

Use case: stylized-concept. ONE standalone custom 3D achievement icon for Stenbygaard Stickers. Identity reference `branding/logo.png`: exact recognizable brown-haired shouting Emil side profile as cream/gold-edged sticker. Material/style reference ONLY `legacy-badges-preview-9/winter.png`, not its winter composition. Rich glossy purple enamel, warm gold/brass, cream and mint accents, tactile playful premium 3D, soft studio light. Bold compact readable 64px silhouette; square contained with 8% clear padding; genuine transparent alpha. No backdrop, floor, floor shadow, outer medal ring, writing, letters, digits or watermark. One Emil face total, no full body or extra human faces. Separate image_gen call per asset, transparent_background=true.

| Nr. | Fil | Badge | Specifik motivprompt |
|---|---|---|---|
| x17 | denmark.png | Rundt i Danmark | Dominant waving red/white Dannebrog with white Scandinavian cross offset toward gold pole. Emil lower left, three tiny purple/cream townhouses below, fine winding gold route with five nodes. No purple flag, other flags, globe or compass. |
| x25 | birthday.png | Emils fødselsdag | Emil wears purple/gold cone party hat above purple frosted birthday cake, cream layers/gold trim, three short glowing gold candles, mint/gold confetti. No writing or number candles. |
| x32 | turbo.png | Turbo | Emil leans forward in front of large diagonal gold lightning bolt with purple inset, three short purple/mint speed streaks behind left. No vehicle, fire, wings, globe or clock. |
| x33 | weekend.png | Weekendkriger | Purple/gold desk calendar, two cream turned pages above, two mint highlighted empty day squares below, Emil on calendar, small purple/gold sunglasses lower right. No letters, numbers, sun or palm. |
| x34 | streak.png | Stime | Three linked cream/purple calendar tiles, gold connector rings, each one mint checkmark. Emil lower center, sculpted gold/orange flame behind. No dates, digits, words or clock. |
| x39 | paaske.png | Påske | Emil wears cream bunny ears with purple inner ears, three decorated purple/mint/gold eggs below/at sides, small cream/pink flowers. One cracked egg with gold glow, no chick, other animal faces or basket handle. |
| x42 | newyear.png | Nytår | Emil wears purple/gold celebration top hat, two sculpted gold/mint fireworks bursts behind corners, purple/gold curled party horn lower right, gold confetti. No year digits, clock, words or bottle. |
| x56–60 | jubilee.png | Jubilar | Emil on purple/gold ribbon rosette, large faceted gold star above, purple/gold confetti popper lower right, cream sticker layers beneath. Shared milestone icon without numbers, crown, trophy cup or outer medal circle. |

## Integration

Alle 75 badge-numre har nu custom design, fordelt på 71 motiver. De fem jubilarer deler `jubilee.webp`, og alle Årets Dengse-årgange deler `year.webp`. Dannebrog er bevaret som motiv på x17; BadgeMedal prioriterer det nye billede og bruger CountryFlag som fallback ved billedfejl. Den oprindelige valuta-banan og de tidligere Fluent-filer bevares.
