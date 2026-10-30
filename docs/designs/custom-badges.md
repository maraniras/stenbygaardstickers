# Custom badge motifs — approved 30 October 2026

Source board: [approved reference](custom-badges-reference.png). Generated with the built-in image_gen tool, then each approved motif was isolated individually with true transparency. Emil's supplied face/logo is the identity reference. No new badge rules, tiers or rewards were introduced.

| ID | Asset | Approved motif |
|---|---|---|
| x67 | banana-baron | Open purple/gold banana vault with Emil cameo |
| x68 | city-guide | Shouting Emil behind folded mint map and gold pin |
| x69 | city-gps | Gold compass, purple needle, red pin, Emil cameo |
| x70 | city-streak | Mint route, three gold map pins, orange flame |
| x71 | wheel-spins | Purple/brass illuminated prize wheel with Emil |
| x72 | wheel-streak | Purple flip calendar, gold checkmarks, wheel seal |
| x73 | wheel-jackpot | Curved whole banana bunch trophy and purple/gold tokens |
| x74 | city-last | Glass hourglass, banana-shaped sand, mint map pin |
| x75 | wheel-nits | Sad lavender kitten, turquoise tear, peel, wheel token |

## Final prompt set

One built-in image_gen call per asset, using the reference board above and transparent_background=true. For each row, substitute its board position and motif into this prompt:

> Use case: background-extraction / precise-object-edit. Production UI asset extraction from the approved reference concept board. Extract ONLY the [position and ID] motif: [motif from the table]. Keep that approved object design, rich3D materials, shape, palette, lighting, composition, all its attached props and recognisable Emil face exactly as in the reference. This is not a redesign. Recompose the complete isolated motif centered in a square with comfortable8 percent transparent padding and a strong silhouette readable at64 pixels. Remove the board's dark purple background, all board headings and all labels/IDs/typography and all other eight motifs. Output one single isolated icon with genuine alpha transparency, no rectangle or baked background, no medal ring, no additional border, no drop shadow on an imaginary floor. Keep the model's natural highlights, tiny crevice shadows and fine details. No text, letters, digits, watermarks or extraneous objects. Keep the approved reference motif's distinctive expression and props unchanged.

Positions are row-major: x67–69 top row, x70–72 middle row, x73–75 bottom row. The source board's title was “SPIL & BANANER · Badge-motiver ·3D”.

### Banana corrections requested after the reference board

The production x73 and x75 assets include these image_gen edits (transparent background), superseding their original board shapes:

- x73: replace the upright peeled banana with a diagonal fan of three whole, unpeeled, strongly curved bananas, narrow brown stems, dark pointed tips and yellow skin seams. No exposed fruit or peeled lobes around a central shaft. Preserve trophy pedestal, tokens, stars, lighting and alpha.
- x75: preserve the kitten, eyes, fur, tear, paws, feet, pose and wheel token. Replace only the malformed peel with an empty yellow banana skin resting across its paws/lap: one joined brown stem, three separate flat drooping flaps, yellow outside, cream inside, brown ends. No loop, tube or exposed fruit.

The last tier of x69 is named **Local Legend**; the earlier tier names and all rewards are unchanged.

## Production assets

`public/badges/custom/<asset>.webp`, optimized with sharp (trim transparent margins; resize within232×232; add12px transparent padding; WebP quality88/alpha100). The long edge is256px. Original individual outputs remain in the imagegen output directory on the generating PC; the approved reference board and production assets follow the repository.

BadgeMedal uses80% of the inner medal face for these detailed custom motifs, preserving all five tier ring colors. `badgeIcon()` routes just these nine IDs to the custom folder. Currency symbols, warehouse bananas and the other existing Fluent badge icons stay separate.
