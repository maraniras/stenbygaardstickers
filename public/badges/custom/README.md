# Custom badges

Appens egne motiver til x67–x75 samt 62 klassiske motiver, genereret med den indbyggede image_gen fra de godkendte prøvesæt og Emils logo. Disse filer er ikke Microsoft Fluent Emoji-filer. De øvrige badge-ikoner beholder deres eksisterende Fluent-kilde og MIT-licens.

Filerne er WebP med ægte alpha, op til256px på længste led og12px gennemsigtig margen. Tier-kanten tegnes af BadgeMedal.vue, ikke i billederne. BananaStorage og valuta-visningen bruger fortsat den oprindelige `/badges/banana-baron.webp`; kun badgeIcon peger ind i denne mappe.

Reference, id-mapping og genereringsprompt: `docs/designs/custom-badges.md`.

De klassiske motiver er dokumenteret i `docs/designs/legacy-badges-preview.md` og `legacy-badges-preview-2.md` til `legacy-badges-preview-10.md`. De ti sæt er nu i brug via badgeIcon(). `year.webp` deles af alle `year-<år>` badges. De fem jubilarer deler nu custom jubilee.webp. Rundt i Danmark bruger custom denmark.webp med Dannebrog; flaget er fallback ved billedfejl. Alle 75 badge-numre dækkes af 71 motiver.

Bananjack-motiver: yderligere otte klargjorte ikoner til x76–83 (i alt 79 custom motiver). Kilder, galleri og prompts i docs/designs/bananjack-badges.md. Disse otte badgekrav/statistik og udbetalinger er endnu ikke aktive; de 75 eksisterende badges er uændrede.
