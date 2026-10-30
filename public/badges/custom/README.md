# Custom badges

Appens egne motiver til x67–x75 samt 54 klassiske badges, genereret med den indbyggede image_gen fra de godkendte prøvesæt og Emils logo. Disse filer er ikke Microsoft Fluent Emoji-filer. De øvrige badge-ikoner beholder deres eksisterende Fluent-kilde og MIT-licens.

Filerne er WebP med ægte alpha, op til256px på længste led og12px gennemsigtig margen. Tier-kanten tegnes af BadgeMedal.vue, ikke i billederne. BananaStorage og valuta-visningen bruger fortsat den oprindelige `/badges/banana-baron.webp`; kun badgeIcon peger ind i denne mappe.

Reference, id-mapping og genereringsprompt: `docs/designs/custom-badges.md`.

De klassiske motiver er dokumenteret i `docs/designs/legacy-badges-preview.md` og `legacy-badges-preview-2.md` til `legacy-badges-preview-9.md`. De ni sæt er nu i brug via badgeIcon(). `year.webp` deles af alle `year-<år>` badges. Eksisterende jubilæumsikoner og flagvisning bevares.
