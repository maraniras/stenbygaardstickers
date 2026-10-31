# Neutrale casino- og hjulbadges

31. oktober 2026. De ni motiver er redigeret med den indbyggede `image_gen` (præcis objektredigering), med de tidligere `public/badges/custom/<id>.webp` som redigeringsmål. De nye PNG-originaler ligger i `neutral-casino-badges/`; optimerede transparente WebP-ikoner er installeret på de samme stier i `public/badges/custom/`. `neutral-casino-badges/index.html` og `oversigt.png` viser sættet.

Alle otte Bananjack-portrætter og portrættet i `wheel-spins` er erstattet. `wheel-streak`, `wheel-jackpot` og `wheel-nits` var allerede uden Emil og er bevaret. Badge-id'er, regler, points, belønninger og fremskridt er uændrede. x83 hedder nu **Dealeren gik over**.

## Prompt-sæt

Fælles krav: precise-object-edit; preserve the existing playful premium glossy 3D styling, purple enamel, warm metallic gold, cream and mint palette, original composition and readable small-size silhouette. No human face, portrait, head, recognizable person or head-shaped sticker anywhere. Genuine transparent alpha background, square fully-contained icon with padding; no backdrop, floor, outer medal ring, watermark or extra text. `transparent_background=true` for alle kald.

| Nr. | Fil | Konkret redigering |
|---|---|---|
| x71 | wheel-spins.png | Replace ONLY the human head/photo in the wheel centre with a polished curved gold banana emblem. Keep the purple and gold prize wheel, pointer, lights, base, perspective, rich 3D materials, composition and transparent padding unchanged. |
| x76 | jack-rounds.png | Remove the human shouting head and its sticker outline from behind the blackjack table. Replace it with a small elegant upright gold spade ornament in the same position. Preserve the green miniature table, cards, gold chips, purple rim, lighting, 3D material detail and transparency. |
| x77 | jack-wins.png | Replace the small human portrait on the front chip stack with a clean round gold chip bearing a purple spade. Preserve the curved gold banana, chip stacks, mint laurels and all other material detail. |
| x78 | jack-naturals.png | Remove the human head portrait from the K playing card. Replace it with a refined large gold crown and small spade motif, part of the purple card face. Preserve the A and K corner ranks, cream/purple cards, curved gold banana below, mint ornaments and high-detail glossy 3D styling. |
| x79 | jack-doubles.png | Remove the human portrait and sticker outline from the ice cube. Show a crisp translucent faceted mint ice cube with a gold doubling arrow visible through it; preserve both purple/gold chip stacks, the large doubling arrows and ice shards. |
| x80 | jack-split.png | Remove the large human head at the bottom. Replace it with a small elegant gold/purple casino chip with a spade emblem, naturally connected to the forked split arrows. Keep the two separate card hands, two green checks and original glossy purple/gold style. |
| x81 | jack-back-to-back.png | Remove the human head on the left. Replace it with one small whole curved golden banana, without covering the four A/K card corners. Preserve the two card pairs, two mint/gold circular arrows, decorations and 3D material detail. |
| x82 | jack-five-card.png | Remove the central human portrait and its outline. Let the decorative gold and purple balancing rail and mint ornaments frame the five clearly visible cards instead. Preserve exactly five cards with ranks A,2,3,5,10, gold/purple suits and rich 3D styling. No sixth card. |
| x83 | jack-dealer-bust.png | Remove the human portrait entirely from the broken purple dealer card. Replace it with a large cracked gold spade integrated in the card. Preserve the fractured purple/gold playing cards, shattered gold line, red/gold fragments and mint shield protecting the curved gold banana. |

Installation: `node scripts/install-badge-art.mjs docs/designs/neutral-casino-badges`. Kun skalering, alpha-bevarende beskæring og WebP-komprimering er udført med sharp; illustrationerne er redigeret med image_gen.
